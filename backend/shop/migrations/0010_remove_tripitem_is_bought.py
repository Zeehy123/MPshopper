from django.db import migrations


def remove_is_bought_column(apps, schema_editor):
    TripItem = apps.get_model('shop', 'TripItem')
    field = TripItem._meta.get_field('is_bought')
    with schema_editor.connection.cursor() as cursor:
        columns = {
            column.name
            for column in schema_editor.connection.introspection.get_table_description(
                cursor, TripItem._meta.db_table
            )
        }
    if field.column in columns:
        schema_editor.remove_field(TripItem, field)


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0009_repair_tripitem_columns'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    remove_is_bought_column, migrations.RunPython.noop
                ),
            ],
            state_operations=[
                migrations.RemoveField(
                    model_name='tripitem',
                    name='is_bought',
                ),
            ],
        ),
    ]
