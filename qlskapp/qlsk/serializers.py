from rest_framework import serializers
from .models import User, HealthProfile, Plan, HealthJournal

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'height', 'weight', 'age', 'health_goal']

class HealthProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthProfile
        fields = ['id', 'bmi', 'water_intake', 'steps', 'heart_rate']

class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ['id', 'plan_type', 'title', 'description', 'created_at']

class HealthJournalSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthJournal
        fields = ['id', 'date', 'content']