from datetime import timedelta

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Category, PantryItem, Product, Tombstone, Trip, TripItem


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


class ProfileTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='grocery-user',
            password='Original-Passphrase-907!',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_profile_update_changes_username_and_password(self):
        response = self.client.patch(
            '/api/auth/profile/',
            {
                'username': 'new-grocery-user',
                'current_password': 'Original-Passphrase-907!',
                'new_password': 'Fresh-Passphrase-841!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'new-grocery-user')
        self.assertTrue(self.user.check_password('Fresh-Passphrase-841!'))

    def test_profile_update_rejects_wrong_current_password(self):
        response = self.client.patch(
            '/api/auth/profile/',
            {
                'username': 'another-name',
                'current_password': 'incorrect',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'grocery-user')


class CheckedItemSyncTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='cart-owner', password='test-password',
        )
        category = Category.objects.create(owner=self.user, name='Fruit')
        product = Product.objects.create(
            owner=self.user, category=category, name='Apple', unit='piece',
            current_price='1.25',
        )
        trip = Trip.objects.create(owner=self.user)
        self.item = TripItem.objects.create(
            owner=self.user, trip=trip, product=product,
            product_name=product.name, product_unit=product.unit,
            quantity='2', price_paid='1.25',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_sync_pull_includes_checked_state_and_product_snapshot(self):
        self.item.is_checked = True
        self.item.save()

        response = self.client.get('/api/sync/pull/')

        self.assertEqual(response.status_code, 200)
        item = response.data['changes']['tripItems'][0]
        self.assertEqual(item['id'], str(self.item.client_id))
        self.assertTrue(item['is_checked'])
        self.assertEqual(item['product_name'], 'Apple')
        self.assertEqual(item['product_unit'], 'piece')

    def test_sync_push_updates_checked_state(self):
        response = self.client.post(
            '/api/sync/push/',
            {
                'upserts': {
                    'tripItems': [{
                        'id': str(self.item.client_id),
                        'trip_id': str(self.item.trip.client_id),
                        'product_id': str(self.item.product.client_id),
                        'quantity': '2',
                        'price_paid': '1.25',
                        'is_checked': True,
                        'created_at': self.item.created_at.isoformat(),
                        'updated_at': (
                            timezone.now() + timedelta(minutes=1)
                        ).isoformat(),
                    }],
                },
                'deletes': [],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.item.refresh_from_db()
        self.assertTrue(self.item.is_checked)

    def test_sync_push_accepts_legacy_bought_state(self):
        response = self.client.post(
            '/api/sync/push/',
            {
                'upserts': {
                    'tripItems': [{
                        'id': str(self.item.client_id),
                        'trip_id': str(self.item.trip.client_id),
                        'product_id': str(self.item.product.client_id),
                        'quantity': '2',
                        'price_paid': '1.25',
                        'is_bought': True,
                        'created_at': self.item.created_at.isoformat(),
                        'updated_at': (
                            timezone.now() + timedelta(minutes=1)
                        ).isoformat(),
                    }],
                },
                'deletes': [],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.item.refresh_from_db()
        self.assertTrue(self.item.is_checked)
        self.assertEqual(self.item.product_name, 'Apple')
        self.assertEqual(self.item.product_unit, 'piece')

    def test_sync_deleting_product_keeps_trip_item_snapshot(self):
        response = self.client.post(
            '/api/sync/push/',
            {
                'upserts': {},
                'deletes': [{
                    'table': 'products',
                    'id': str(self.item.product.client_id),
                }],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(Product.objects.filter(pk=self.item.product_id).exists())
        self.item.refresh_from_db()
        self.assertIsNone(self.item.product)
        self.assertEqual(self.item.product_name, 'Apple')
        self.assertEqual(self.item.product_unit, 'piece')

    def test_sync_deletes_trip_items_before_trip_and_keeps_products(self):
        trip = self.item.trip
        product = self.item.product

        response = self.client.post(
            '/api/sync/push/',
            {
                'upserts': {},
                'deletes': [
                    {'table': 'tripItems', 'id': str(self.item.client_id)},
                    {'table': 'trips', 'id': str(trip.client_id)},
                ],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(Trip.objects.filter(pk=trip.pk).exists())
        self.assertFalse(TripItem.objects.filter(pk=self.item.pk).exists())
        self.assertTrue(Product.objects.filter(pk=product.pk).exists())


class BarcodeSyncTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='scanner', password='test-password',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _push_product(self, cid, barcode):
        return self.client.post(
            '/api/sync/push/',
            {
                'upserts': {
                    'products': [{
                        'id': cid, 'name': 'Milk', 'unit': 'carton',
                        'category_id': None, 'default_quantity': '1',
                        'current_price': '950', 'barcode': barcode,
                        'updated_at': timezone.now().isoformat(),
                    }],
                },
                'deletes': [],
            },
            format='json',
        )

    def test_push_saves_the_barcode(self):
        cid = '33333333-3333-3333-3333-333333333333'
        self.assertEqual(self._push_product(cid, ' 5449000000996 ').status_code, 200)
        self.assertEqual(Product.objects.get(client_id=cid).barcode, '5449000000996')

    def test_pull_returns_the_barcode(self):
        Product.objects.create(
            owner=self.user, name='Milk', unit='carton',
            current_price='950', barcode='5449000000996',
        )
        response = self.client.get('/api/sync/pull/')
        self.assertEqual(response.data['changes']['products'][0]['barcode'], '5449000000996')

    def test_a_missing_barcode_is_stored_as_empty(self):
        cid = '44444444-4444-4444-4444-444444444444'
        self.assertEqual(self._push_product(cid, None).status_code, 200)
        self.assertEqual(Product.objects.get(client_id=cid).barcode, '')


class PantrySyncTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='cook', password='test-password',
        )
        self.product = Product.objects.create(
            owner=self.user, name='Rice', unit='bag', current_price='5000',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _push(self, quantity, low_at, cid='55555555-5555-5555-5555-555555555555'):
        return self.client.post(
            '/api/sync/push/',
            {
                'upserts': {
                    'pantry': [{
                        'id': cid, 'product_id': str(self.product.client_id),
                        'quantity': quantity, 'low_at': low_at,
                        'updated_at': timezone.now().isoformat(),
                    }],
                },
                'deletes': [],
            },
            format='json',
        )

    def test_push_creates_a_pantry_entry(self):
        self.assertEqual(self._push('3', '1').status_code, 200)
        entry = PantryItem.objects.get()
        self.assertEqual(entry.owner, self.user)
        self.assertEqual(entry.product, self.product)
        self.assertEqual(str(entry.quantity), '3.00')

    def test_negative_amounts_are_rejected(self):
        response = self._push('-1', '1')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(PantryItem.objects.exists())

    def test_pull_returns_only_my_pantry(self):
        PantryItem.objects.create(owner=self.user, product=self.product, quantity='2')
        stranger = get_user_model().objects.create_user(
            username='stranger', password='test-password',
        )
        other_product = Product.objects.create(
            owner=stranger, name='Beans', unit='kg', current_price='1000',
        )
        PantryItem.objects.create(owner=stranger, product=other_product, quantity='9')

        response = self.client.get('/api/sync/pull/')
        rows = response.data['changes']['pantry']
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['product_id'], str(self.product.client_id))

    def test_deleting_a_product_removes_its_pantry_entry(self):
        PantryItem.objects.create(owner=self.user, product=self.product, quantity='2')
        response = self.client.post(
            '/api/sync/push/',
            {
                'upserts': {},
                'deletes': [{'table': 'products', 'id': str(self.product.client_id)}],
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(PantryItem.objects.exists())


class ProductDeleteKeepsHistoryTests(TestCase):
    def test_trip_item_survives_with_its_snapshot_when_the_product_is_deleted(self):
        user = get_user_model().objects.create_user(
            username='keeper', password='test-password',
        )
        product = Product.objects.create(
            owner=user, name='Tomatoes', unit='basket', current_price='2000',
        )
        trip = Trip.objects.create(owner=user, is_completed=True)
        item = TripItem.objects.create(
            owner=user, trip=trip, product=product,
            product_name='Tomatoes', product_unit='basket',
            quantity='2', price_paid='2000',
        )
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post(
            '/api/sync/push/',
            {
                'upserts': {},
                'deletes': [{'table': 'products', 'id': str(product.client_id)}],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        item.refresh_from_db()
        self.assertIsNone(item.product)
        self.assertEqual(item.product_name, 'Tomatoes')
        self.assertTrue(Tombstone.objects.filter(table='products', owner=user).exists())
