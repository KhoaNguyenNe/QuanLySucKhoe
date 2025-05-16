from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, HealthProfileViewSet, ExerciseViewSet, TrainingScheduleViewSet,
    TrainingSessionViewSet, NutritionPlanViewSet, ReminderViewSet, ChatMessageViewSet, HealthJournalViewSet, UserStatisticsView, NutritionSuggestionView, ChatHistoryView, FlexibleReminderView,
    RegisterView, LoginView
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'exercises', ExerciseViewSet)
router.register(r'training-schedules', TrainingScheduleViewSet)
router.register(r'training-sessions', TrainingSessionViewSet)
router.register(r'reminders', ReminderViewSet)
router.register(r'chat-messages', ChatMessageViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('oauth/', include('oauth2_provider.urls', namespace='oauth2_provider')),
    path('auth/', include('dj_rest_auth.urls')),
    path('auth/registration/', include('dj_rest_auth.registration.urls')),
    path('users/<int:user_id>/health-profile/', HealthProfileViewSet.as_view({'get': 'retrieve'}),
         name='user-health-profile'),
    path('users/<int:user_id>/nutrition-plans/', NutritionPlanViewSet.as_view({'get': 'list'}), name='user-plans'),
    path('users/<int:user_id>/journals/', HealthJournalViewSet.as_view({'get': 'list'}), name='user-journals'),
    path('users/<int:user_id>/statistics/', UserStatisticsView.as_view(), name='user-statistics'),
    path('users/<int:user_id>/nutrition-suggestion/', NutritionSuggestionView.as_view(), name='nutrition-suggestion'),
    path('chat-history/<int:user_id>/<int:expert_id>/', ChatHistoryView.as_view(), name='chat-history'),
    path('reminders/flexible/', FlexibleReminderView.as_view(), name='flexible-reminder'),
]