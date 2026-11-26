from django.db import migrations


def repair_tripitem_columns(apps, schema_editor):
    TripItem = apps.get_model('shop', 'TripItem')
    table = TripItem._meta.db_table
    quote = schema_editor.quote_name

    with schema_editor.connection.cursor() as cursor:
        columns = {
            column.name
            for column in schema_editor.connection.introspection.get_table_description(
                cursor, table
            )
        }

    for name in ('product_name', 'product_unit', 'is_checked'):
        field = TripItem._meta.get_field(name)
        if field.column not in columns:
            schema_editor.add_field(TripItem, field)
            columns.add(field.column)

    product_field = TripItem._meta.get_field('product')
    with schema_editor.connection.cursor() as cursor:
        description = schema_editor.connection.introspection.get_table_description(
            cursor, table
        )
        product_column = next(
            column for column in description if column.name == product_field.column
        )
        if not product_column.null_ok:
            cursor.execute(
                f'ALTER TABLE {quote(table)} '
                f'ALTER COLUMN {quote(product_field.column)} DROP NOT NULL'
            )

        if 'is_bought' in columns:
            cursor.execute(
                f'UPDATE {quote(table)} '
                f'SET {quote("is_checked")} = '
                f'{quote("is_checked")} OR COALESCE({quote("is_bought")}, FALSE)'
            )

    product = TripItem._meta.get_field('product').remote_field.model._meta.db_table
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            f'UPDATE {quote(table)} AS trip_item '
            f'SET {quote("product_name")} = '
            f'COALESCE(NULLIF(trip_item.{quote("product_name")}, \'\'), '
            f'product.{quote("name")}), '
            f'{quote("product_unit")} = '
            f'COALESCE(NULLIF(trip_item.{quote("product_unit")}, \'\'), '
            f'product.{quote("unit")}) '
            f'FROM {quote(product)} AS product '
            f'WHERE trip_item.{quote("product_id")} = product.{quote("id")}'
        )


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0008_merge_20261126_1154'),
    ]

    operations = [
        migrations.RunPython(repair_tripitem_columns, migrations.RunPython.noop),
    ]
