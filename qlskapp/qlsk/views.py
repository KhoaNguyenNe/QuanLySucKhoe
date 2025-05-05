from rest_framework import viewsets, permissions
from .models import User, HealthProfile, Plan, HealthJournal
from .serializers import UserSerializer, HealthProfileSerializer, PlanSerializer, HealthJournalSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

class HealthProfileViewSet(viewsets.ModelViewSet):
    queryset = HealthProfile.objects.all()
    serializer_class = HealthProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

class PlanViewSet(viewsets.ModelViewSet):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    permission_classes = [permissions.IsAuthenticated]

class HealthJournalViewSet(viewsets.ModelViewSet):
    queryset = HealthJournal.objects.all()
    serializer_class = HealthJournalSerializer
    permission_classes = [permissions.IsAuthenticated]