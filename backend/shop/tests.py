from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from .models import Tombstone


class SyncPullTests(TestCase):
    def test_pull_returns_only_current_users_tombstones(self):
        user_model = get_user_model()
        owner = user_model.objects.create_user(username='owner', password='test')
        other = user_model.objects.create_user(username='other', password='test')
        Tombstone.objects.create(
            owner=owner, table='products',
            client_id='11111111-1111-1111-1111-111111111111',
        )
        Tombstone.objects.create(
            owner=other, table='products',
            client_id='22222222-2222-2222-2222-222222222222',
        )

        client = APIClient()
        client.force_authenticate(user=owner)
        response = client.get('/api/sync/pull/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data['deleted'],
            [{'table': 'products', 'id': '11111111-1111-1111-1111-111111111111'}],
        )
