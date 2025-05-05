from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, HealthProfileViewSet, PlanViewSet, HealthJournalViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'health-profiles', HealthProfileViewSet)
router.register(r'plans', PlanViewSet)
router.register(r'journals', HealthJournalViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('oauth/', include('oauth2_provider.urls', namespace='oauth2_provider')),
]