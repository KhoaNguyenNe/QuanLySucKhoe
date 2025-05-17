from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, HealthProfileViewSet, ExerciseViewSet, TrainingScheduleViewSet,
    TrainingSessionViewSet, NutritionPlanViewSet, ReminderViewSet, ChatMessageViewSet, HealthJournalViewSet, UserStatisticsView, NutritionSuggestionView, ChatHistoryView, FlexibleReminderView, RegisterView, UserProfileView
)
from rest_framework.authtoken.views import obtain_auth_token
from django.contrib.auth import views as auth_views
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
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
    
    # User Profile
    path('auth/profile/', UserProfileView.as_view(), name='user-profile'),
    
    # JWT Authentication URLs
    path('auth/jwt/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/jwt/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/jwt/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # OAuth2 URLs
    path('oauth/', include('oauth2_provider.urls', namespace='oauth2_provider')),
    
    # Other Authentication URLs
    path('auth/token/', obtain_auth_token, name='api_token_auth'),
    path('auth/login/', auth_views.LoginView.as_view(), name='login'),
    path('auth/logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('auth/password-reset/', auth_views.PasswordResetView.as_view(), name='password_reset'),
    path('auth/password-reset/done/', auth_views.PasswordResetDoneView.as_view(), name='password_reset_done'),
    path('auth/reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('auth/reset/done/', auth_views.PasswordResetCompleteView.as_view(), name='password_reset_complete'),
    
    # REST Auth URLs
    path('auth/', include('dj_rest_auth.urls')),
    path('auth/registration/', include('dj_rest_auth.registration.urls')),
    
    # Other URLs
    path('users/<int:user_id>/health-profile/', HealthProfileViewSet.as_view({'get': 'retrieve'}), name='user-health-profile'),
    path('users/<int:user_id>/nutrition-plans/', NutritionPlanViewSet.as_view({'get': 'list'}), name='user-plans'),
    path('users/<int:user_id>/journals/', HealthJournalViewSet.as_view({'get': 'list'}), name='user-journals'),
    path('users/<int:user_id>/statistics/', UserStatisticsView.as_view(), name='user-statistics'),
    path('users/<int:user_id>/nutrition-suggestion/', NutritionSuggestionView.as_view(), name='nutrition-suggestion'),
    path('chat-history/<int:user_id>/<int:expert_id>/', ChatHistoryView.as_view(), name='chat-history'),
    path('reminders/flexible/', FlexibleReminderView.as_view(), name='flexible-reminder'),
]