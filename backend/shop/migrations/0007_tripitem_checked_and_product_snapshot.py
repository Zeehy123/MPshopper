from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0006_product_image_url'),
    ]

    operations = [
        # a product can now be deleted; its past trip items keep their name
        migrations.AlterField(
            model_name='tripitem',
            name='product',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to='shop.product',
            ),
        ),
        migrations.AddField(
            model_name='tripitem',
            name='product_name',
            field=models.CharField(blank=True, default='', max_length=150),
        ),
        migrations.AddField(
            model_name='tripitem',
            name='product_unit',
            field=models.CharField(blank=True, default='', max_length=30),
        ),
        migrations.AddField(
            model_name='tripitem',
            name='is_checked',
            field=models.BooleanField(default=False),
        ),
    ]
