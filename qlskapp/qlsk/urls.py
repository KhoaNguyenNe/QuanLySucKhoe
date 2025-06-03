from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, ExerciseViewSet, TrainingScheduleViewSet,
    TrainingSessionViewSet, NutritionPlanViewSet, ReminderViewSet, ChatMessageViewSet, HealthJournalViewSet, UserStatisticsView, NutritionSuggestionView, ChatHistoryView, FlexibleReminderView, SendOTPView, ConfirmOTPView, GoogleLoginAPIView, WorkoutSessionViewSet, HealthMetricsViewSet,
    TrainingHistoryView, TrainingStatisticsView, WaterSessionListCreateView,
)
from rest_framework.authtoken.views import obtain_auth_token
from django.contrib.auth import views as auth_views
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'exercises', ExerciseViewSet, basename='exercise')
router.register(r'training-schedules', TrainingScheduleViewSet, basename='trainingschedule')
router.register(r'training-sessions', TrainingSessionViewSet, basename='trainingsession')
router.register(r'reminders', ReminderViewSet, basename='reminder')
router.register(r'chat-messages', ChatMessageViewSet, basename='chatmessage')
router.register(r'workout-sessions', WorkoutSessionViewSet, basename='workoutsession')
router.register(r'journals', HealthJournalViewSet, basename='journal')
router.register(r'health-metrics', HealthMetricsViewSet, basename='health-metrics')

urlpatterns = [
    path('', include(router.urls)),
    path('register/', UserViewSet.as_view({'post': 'register'}), name='register'),
    
    # User Profile
    path('auth/profile/', UserViewSet.as_view({'get': 'profile', 'put': 'profile'}), name='user-profile'),
    
    # JWT Authentication URLs
    path('auth/jwt/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/jwt/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/jwt/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # OAuth2 URLs
    path('oauth/', include('oauth2_provider.urls', namespace='oauth2_provider')),
    
    # Other Authentication URLs
    path('auth/login/', auth_views.LoginView.as_view(), name='login'),
    path('auth/logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('auth/reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('auth/reset/done/', auth_views.PasswordResetCompleteView.as_view(), name='password_reset_complete'),
    
    path('auth/password/send-otp/', SendOTPView.as_view()),
    path('auth/password/confirm-otp/', ConfirmOTPView.as_view()),
    
    # REST Auth URLs
    path('auth/', include('dj_rest_auth.urls')),
    path('auth/', include('dj_rest_auth.registration.urls')),
    path('auth/', include('allauth.socialaccount.urls')),
    path('auth/google-login/', GoogleLoginAPIView.as_view(), name='google-login'),
    
    # Other URLs
    path('users/<int:user_id>/nutrition-plans/', NutritionPlanViewSet.as_view({'get': 'list'}), name='user-plans'),
    path('users/<int:user_id>/journals/', HealthJournalViewSet.as_view({'get': 'list'}), name='user-journals'),
    path('users/<int:user_id>/statistics/', UserStatisticsView.as_view(), name='user-statistics'),    
    path('users/<int:user_id>/nutrition-suggestion/', NutritionSuggestionView.as_view(), name='nutrition-suggestion'),
    
    path('chat-history/<int:user_id>/<int:expert_id>/', ChatHistoryView.as_view(), name='chat-history'),
    
    path('reminders/flexible/', FlexibleReminderView.as_view(), name='flexible-reminder'),
    
    path('health-metrics/get/', HealthMetricsViewSet.as_view({'get': 'get_health_metrics'}), name='get-health-metrics'),
    path('health-metrics/water/', HealthMetricsViewSet.as_view({'post': 'update_water_intake'}), name='update-water-intake'),
    path('health-metrics/steps/', HealthMetricsViewSet.as_view({'post': 'update_steps'}), name='update-steps'),
    path('health-metrics/heart-rate/', HealthMetricsViewSet.as_view({'post': 'update_heart_rate'}), name='update-heart-rate'),
    path('health-metrics/bmi/', HealthMetricsViewSet.as_view({'post': 'update_bmi'}), name='update-bmi'),
    path('health-metrics/history/', HealthMetricsViewSet.as_view({'get': 'get_health_history'}), name='get-health-history'),
    path('training-history/', TrainingHistoryView.as_view(), name='training-history'),
    path('training-statistics/', TrainingStatisticsView.as_view(), name='training-statistics'),
    path('water-sessions/', WaterSessionListCreateView.as_view(), name='water-session-list-create'),
]