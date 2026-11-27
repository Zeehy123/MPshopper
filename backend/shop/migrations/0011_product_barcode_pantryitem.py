import django.db.models.deletion
import django.utils.timezone
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0010_remove_tripitem_is_bought'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='barcode',
            field=models.CharField(blank=True, db_index=True, default='', max_length=32),
        ),
        migrations.CreateModel(
            name='PantryItem',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('client_id', models.UUIDField(blank=True, editable=False, null=True, unique=True)),
                ('modified_at', models.DateTimeField(db_index=True, default=django.utils.timezone.now, editable=False)),
                ('quantity', models.DecimalField(decimal_places=2, default=Decimal('0'), max_digits=8)),
                ('low_at', models.DecimalField(decimal_places=2, default=Decimal('1'), max_digits=8)),
                ('owner', models.ForeignKey(blank=True, editable=False, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='+', to=settings.AUTH_USER_MODEL)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pantry_entries', to='shop.product')),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
