# Generated by Django 5.1.6 on 2025-05-05 14:36

import ckeditor.fields
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('qlsk', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='healthjournal',
            name='content',
            field=ckeditor.fields.RichTextField(),
        ),
    ]
