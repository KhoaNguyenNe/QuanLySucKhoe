from rest_framework import viewsets, permissions, status, parsers
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from .models import User, Exercise, TrainingSchedule, TrainingSession, Reminder, HealthJournal, PasswordResetOTP, WorkoutSession, WorkoutExercise, HealthMetricsHistory, WaterSession, DietGoal, MealPlan, Meal
from .serializers import (
    UserSerializer, ExerciseSerializer, TrainingScheduleSerializer,
    TrainingSessionSerializer, ReminderSerializer, HealthJournalSerializer,
    RegisterSerializer, WorkoutSessionSerializer, WorkoutExerciseSerializer, HealthMetricsHistorySerializer, WaterSessionSerializer, DietGoalSerializer, MealPlanSerializer, MealSerializer, MealPlanDetailSerializer
)
from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.decorators import action, api_view, permission_classes
from .permissions import IsOwnerOrReadOnly, IsExpert, IsOwnerOrExpert
import random
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from google.oauth2 import id_token
from google.auth.transport import requests
from rest_framework_simplejwt.tokens import RefreshToken
from django.db import models
from django.db.models import Sum, Count
from rest_framework.permissions import IsAuthenticated
from rest_framework import generics
import openai
from django.conf import settings
from openai import OpenAI
import requests
import os
import re

# User ViewSet (chỉ đăng ký, lấy/cập nhật profile)
class UserViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_queryset(self):
        queryset = User.objects.all()
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        return queryset

    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({"message": "Đăng ký thành công", "user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get', 'put'], permission_classes=[permissions.IsAuthenticated])
    def profile(self, request):
        user = request.user
        if request.method == 'GET':
            serializer = UserSerializer(user)
            # Thống kê nhanh
            now = timezone.now().date()
            week_ago = now - timedelta(days=7)
            week_sessions = TrainingSession.objects.filter(schedule__user=user, schedule__date__gte=week_ago).count()
            reminders = Reminder.objects.filter(user=user).count()
            response_data = {
                'user': serializer.data,
                'statistics': {
                    'weekly_sessions': week_sessions,
                    'total_reminders': reminders,
                }
            }
            return Response(response_data, status=status.HTTP_200_OK)
        elif request.method == 'PUT':
            serializer = UserSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({'user': serializer.data}, status=200)
            return Response(serializer.errors, status=400)

    def list(self, request):
        queryset = self.get_queryset()
        serializer = UserSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def experts(self, request):
        """API lấy danh sách chuyên gia"""
        experts = User.objects.filter(role='expert')
        serializer = UserSerializer(experts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def link_expert(self, request):
        """API liên kết user với chuyên gia"""
        expert_id = request.data.get('expert_id')
        try:
            expert = User.objects.get(id=expert_id, role='expert')
        except User.DoesNotExist:
            return Response({'detail': 'Không tìm thấy chuyên gia.'}, status=404)
        user = request.user
        user.expert = expert
        user.notified_expert = False  # Đánh dấu chưa thông báo cho chuyên gia
        user.save()
        return Response({'detail': f'Liên kết với chuyên gia {expert.username} thành công.'})

    @action(detail=False, methods=['get'], url_path='new-linked-users', permission_classes=[permissions.IsAuthenticated])
    def new_linked_users(self, request):
        """API cho chuyên gia lấy danh sách user mới liên kết (chưa thông báo)"""
        if request.user.role != 'expert':
            return Response({'detail': 'Chỉ chuyên gia mới có quyền.'}, status=403)
        new_users = request.user.clients.filter(notified_expert=False)
        serializer = UserSerializer(new_users, many=True)
        # Đánh dấu đã thông báo
        new_users.update(notified_expert=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='my-clients', permission_classes=[permissions.IsAuthenticated])
    def my_clients(self, request):
        try:
            print("User:", request.user)
            print("Role:", getattr(request.user, 'role', None))
            print("Clients:", getattr(request.user, 'clients', None))
            if request.user.role != 'expert':
                return Response({'detail': 'Chỉ chuyên gia mới có quyền xem danh sách này.'}, status=403)
            clients = request.user.clients.all()
            serializer = UserSerializer(clients, many=True)
            return Response(serializer.data)
        except Exception as e:
            print("Error in my_clients:", str(e))
            return Response({'detail': str(e)}, status=400)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def unlink_expert(self, request):
        """API hủy liên kết chuyên gia"""
        user = request.user
        if not user.expert:
            return Response({'detail': 'Bạn chưa liên kết với chuyên gia nào.'}, status=400)
        user.expert = None
        user.save()
        return Response({'detail': 'Đã hủy liên kết với chuyên gia.'})

    def retrieve(self, request, pk=None):
        try:
            pk_int = int(pk)
            if pk_int <= 0:
                raise ValueError()
        except Exception:
            print("Lỗi retrieve user, pk nhận được:", pk)
            return Response({'detail': 'Invalid user id.'}, status=400)
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Không tìm thấy người dùng.'}, status=404)
        serializer = UserSerializer(user)
        return Response(serializer.data)

# Exercise ViewSet (chỉ list, retrieve)
class ExerciseViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser]
    def list(self, request):
        # Bài tập hệ thống hoặc bài tập cá nhân của user
        exercises = Exercise.objects.filter(
            models.Q(is_custom=False) | (models.Q(is_custom=True) & models.Q(user=request.user))
        )
        serializer = ExerciseSerializer(exercises, many=True)
        return Response(serializer.data)
    def retrieve(self, request, pk=None):
        exercise = Exercise.objects.filter(pk=pk).first()
        if not exercise:
            return Response({"detail": "Not found."}, status=404)
        # Chỉ cho phép xem bài tập hệ thống hoặc bài tập cá nhân của mình
        if exercise.is_custom and exercise.user != request.user:
            return Response({"detail": "Permission denied."}, status=403)
        serializer = ExerciseSerializer(exercise)
        return Response(serializer.data)
    def create(self, request):
        # Chỉ cho phép user tạo bài tập cá nhân
        data = request.data.copy()
        data['is_custom'] = True
        serializer = ExerciseSerializer(data=data)
        if serializer.is_valid():
            serializer.save(user=request.user, is_custom=True)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    def update(self, request, pk=None):
        exercise = Exercise.objects.filter(pk=pk, user=request.user, is_custom=True).first()
        if not exercise:
            return Response({"detail": "Not found or permission denied."}, status=404)
        serializer = ExerciseSerializer(exercise, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    def destroy(self, request, pk=None):
        exercise = Exercise.objects.filter(pk=pk, user=request.user, is_custom=True).first()
        if not exercise:
            return Response({"detail": "Not found or permission denied."}, status=404)
        exercise.delete()
        return Response(status=204)

# Training Schedule ViewSet (list, create, retrieve)
class TrainingScheduleViewSet(viewsets.ViewSet):
    permission_classes = [IsOwnerOrReadOnly]
    def list(self, request):
        schedules = TrainingSchedule.objects.filter(user=request.user)
        serializer = TrainingScheduleSerializer(schedules, many=True)
        return Response(serializer.data)
    def create(self, request):
        serializer = TrainingScheduleSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    def retrieve(self, request, pk=None):
        schedule = TrainingSchedule.objects.filter(pk=pk, user=request.user).first()
        if not schedule:
            return Response({"detail": "Not found."}, status=404)
        serializer = TrainingScheduleSerializer(schedule)
        return Response(serializer.data)

# Training Session ViewSet (list, create, retrieve, add feedback)
class TrainingSessionViewSet(viewsets.ViewSet):
    permission_classes = [IsOwnerOrReadOnly]
    parser_classes = [parsers.MultiPartParser]
    def list(self, request):
        sessions = TrainingSession.objects.filter(schedule__user=request.user)
        serializer = TrainingSessionSerializer(sessions, many=True)
        return Response(serializer.data)
    def create(self, request):
        serializer = TrainingSessionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    def retrieve(self, request, pk=None):
        session = TrainingSession.objects.filter(pk=pk, schedule__user=request.user).first()
        if not session:
            return Response({"detail": "Not found."}, status=404)
        serializer = TrainingSessionSerializer(session)
        return Response(serializer.data)
    def update(self, request, pk=None):
        session = TrainingSession.objects.filter(pk=pk, schedule__user=request.user).first()
        if not session:
            return Response({"detail": "Not found."}, status=404)
        serializer = TrainingSessionSerializer(session, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    @action(detail=True, methods=['post'])
    def add_feedback(self, request, pk=None):
        session = TrainingSession.objects.filter(pk=pk, schedule__user=request.user).first()
        feedback = request.data.get('feedback')
        if session and feedback:
            session.feedback = feedback
            session.save()
            return Response({'detail': 'Feedback saved.'}, status=200)
        return Response({'detail': 'Feedback is required or session not found.'}, status=400)

# Reminder ViewSet (CRUD)
class ReminderViewSet(viewsets.ViewSet):
    permission_classes = [IsOwnerOrReadOnly]
    def list(self, request):
        reminders = Reminder.objects.filter(user=request.user)
        serializer = ReminderSerializer(reminders, many=True)
        return Response(serializer.data)
    def create(self, request):
        serializer = ReminderSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    def retrieve(self, request, pk=None):
        reminder = Reminder.objects.filter(pk=pk, user=request.user).first()
        if not reminder:
            return Response({"detail": "Not found."}, status=404)
        serializer = ReminderSerializer(reminder)
        return Response(serializer.data)
    def update(self, request, pk=None):
        reminder = Reminder.objects.filter(pk=pk, user=request.user).first()
        if not reminder:
            return Response({"detail": "Not found."}, status=404)
        serializer = ReminderSerializer(reminder, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    def destroy(self, request, pk=None):
        reminder = Reminder.objects.filter(pk=pk, user=request.user).first()
        if not reminder:
            return Response({"detail": "Not found."}, status=404)
        reminder.delete()
        return Response(status=204)

# Health Journal ViewSet (list, create)
class HealthJournalViewSet(viewsets.ViewSet):
    permission_classes = [IsOwnerOrReadOnly]
    def list(self, request):
        journals = HealthJournal.objects.filter(user=request.user)
        serializer = HealthJournalSerializer(journals, many=True)
        return Response(serializer.data)
    def create(self, request):
        serializer = HealthJournalSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

# Các API custom giữ nguyên
class UserStatisticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request, user_id=None):
        if request.user.role == 'user' and request.user.id != user_id:
            return Response({'detail': 'Permission denied.'}, status=403)
        now = timezone.now().date()
        start_of_week = now - timedelta(days=now.weekday())  # Thứ 2 đầu tuần
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({'detail': 'User not found.'}, status=404)
        # Lấy chỉ số sức khỏe gần nhất
        latest_metrics = HealthMetricsHistory.objects.filter(user_id=user_id).order_by('-date', '-time').first()

        # WEEK: trả về mảng 7 ngày của tuần hiện tại (thứ 2 đến CN)
        week_data = []
        for i in range(7):
            day = start_of_week + timedelta(days=i)
            sessions = WorkoutSession.objects.filter(
                user=user,
                start_time__date=day,
                is_completed=True
            )
            session_count = sessions.count()
            total_calories = sessions.aggregate(Sum('total_calories'))['total_calories__sum'] or 0
            week_data.append({
                'date': day.strftime('%d/%m'),
                'session_count': session_count,
                'total_calories': total_calories,
            })

        # MONTH: trả về mảng 12 tháng
        month_data = []
        for m in range(1, 13):
            sessions = WorkoutSession.objects.filter(
                user=user,
                start_time__year=now.year,
                start_time__month=m,
                is_completed=True
            )
            session_count = sessions.count()
            total_calories = sessions.aggregate(Sum('total_calories'))['total_calories__sum'] or 0
            month_data.append({
                'month': f'{m:02d}/{now.year}',
                'session_count': session_count,
                'total_calories': total_calories,
            })

        # YEAR: trả về mảng các năm có dữ liệu
        years = WorkoutSession.objects.filter(
            user=user,
            is_completed=True
        ).dates('start_time', 'year')
        year_data = []
        for y in years:
            sessions = WorkoutSession.objects.filter(
                user=user,
                start_time__year=y.year,
                is_completed=True
            )
            session_count = sessions.count()
            total_calories = sessions.aggregate(Sum('total_calories'))['total_calories__sum'] or 0
            year_data.append({
                'year': y.year,
                'session_count': session_count,
                'total_calories': total_calories,
            })

        data = {
            'bmi': user.bmi,
            'latest_metrics': HealthMetricsHistorySerializer(latest_metrics).data if latest_metrics else None,
            'week': week_data,
            'month': month_data,
            'year': year_data,
        }
        return Response(data, status=200)

class FlexibleReminderView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        reminder_type = request.data.get('reminder_type')
        time = request.data.get('time')
        message = request.data.get('message')
        date = request.data.get('date')
        repeat_days = request.data.get('repeat_days')
        enabled = request.data.get('enabled', True)
        if not (reminder_type and time and message):
            return Response({'detail': 'Missing required fields.'}, status=400)
        reminder = Reminder.objects.create(
            user=request.user,
            reminder_type=reminder_type,
            date=date,
            time=time,
            message=message,
            repeat_days=repeat_days,
            enabled=enabled
        )
        return Response({'detail': 'Reminder created.', 'reminder_id': reminder.id}, status=201)

class SendOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email là bắt buộc'}, status=400)
        otp = str(random.randint(100000, 999999))
        PasswordResetOTP.objects.create(email=email, otp=otp)
        send_mail(
            'Mã OTP đặt lại mật khẩu',
            f'Mã OTP của bạn là: {otp}',
            'no-reply@yourdomain.com',
            [email],
        )
        return Response({'message': 'OTP đã được gửi về email'}, status=200)

class ConfirmOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        email = request.data.get('email')
        otp = request.data.get('otp')
        new_password = request.data.get('new_password')
        if not all([email, otp, new_password]):
            return Response({'error': 'Thiếu thông tin'}, status=400)
        try:
            otp_obj = PasswordResetOTP.objects.filter(email=email, otp=otp, is_used=False).latest('created_at')
        except PasswordResetOTP.DoesNotExist:
            return Response({'error': 'OTP không hợp lệ'}, status=400)
        if timezone.now() - otp_obj.created_at > timedelta(minutes=10):
            return Response({'error': 'OTP đã hết hạn'}, status=400)
        User = get_user_model()
        try:
            user = User.objects.get(email=email)
            user.set_password(new_password)
            user.save()
            otp_obj.is_used = True
            otp_obj.save()
            return Response({'message': 'Đổi mật khẩu thành công'}, status=200)
        except User.DoesNotExist:
            return Response({'error': 'Không tìm thấy user'}, status=404)

class GoogleLoginAPIView(APIView):
    def post(self, request):
        token = request.data.get('access_token')
        try:
            idinfo = id_token.verify_oauth2_token(token, requests.Request())
            email = idinfo['email']
            user, created = User.objects.get_or_create(email=email)
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

# Workout Session ViewSet
class WorkoutSessionViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        sessions = WorkoutSession.objects.filter(user=request.user).order_by('-start_time')
        serializer = WorkoutSessionSerializer(sessions, many=True)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        try:
            # Kiểm tra danh sách bài tập
            exercises = request.data.get('exercises', [])
            if not exercises:
                return Response(
                    {"error": "No exercises selected."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Tạo buổi tập mới
            session = WorkoutSession.objects.create(
                user=request.user,
                start_time=timezone.now()
            )

            # Lấy danh sách ID bài tập
            exercise_ids = []
            for ex in exercises:
                try:
                    ex_id = int(ex.get('id', 0))
                    if ex_id > 0:
                        exercise_ids.append(ex_id)
                except (ValueError, TypeError):
                    continue
            
            # Kiểm tra xem có ID bài tập hợp lệ không
            if not exercise_ids:
                session.delete()
                return Response(
                    {"error": "No valid exercise IDs provided."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Lấy các bài tập từ database
            exercises = Exercise.objects.filter(id__in=exercise_ids)
            
            # Kiểm tra xem có tìm thấy bài tập nào không
            if not exercises.exists():
                session.delete()
                return Response(
                    {"error": "No valid exercises found."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Tạo các bài tập cho buổi tập
            workout_exercises = []
            for exercise in exercises:
                workout_exercise = WorkoutExercise(
                    workout_session=session,
                    exercise=exercise,
                    duration=0,  # Giá trị mặc định
                    calories_burned=0  # Giá trị mặc định
                )
                workout_exercises.append(workout_exercise)
            
            # Lưu tất cả các bài tập cùng một lúc
            WorkoutExercise.objects.bulk_create(workout_exercises)

            # Lấy lại session với các bài tập đã tạo
            session.refresh_from_db()

            # Serialize và trả về kết quả
            serializer = WorkoutSessionSerializer(session, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            # Nếu có lỗi, xóa buổi tập nếu đã tạo
            if 'session' in locals():
                session.delete()
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def retrieve(self, request, pk=None):
        session = WorkoutSession.objects.filter(pk=pk, user=request.user).first()
        if not session:
            return Response({'detail': 'Not found.'}, status=404)
            
        serializer = WorkoutSessionSerializer(session)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def complete_exercise(self, request, pk=None):
        try:
            print(f"Received data: {request.data}")  # Log dữ liệu nhận được
            
            session = WorkoutSession.objects.filter(pk=pk, user=request.user).first()
            if not session:
                return Response({'detail': 'Không tìm thấy buổi tập.'}, status=404)
                
            exercise_id = request.data.get('exercise_id')
            duration = request.data.get('duration')
            calories_burned = request.data.get('calories_burned')
            
            print(f"Exercise ID: {exercise_id}, Duration: {duration}, Calories: {calories_burned}")  # Log dữ liệu đã parse
            
            # Kiểm tra dữ liệu đầu vào
            if not exercise_id:
                return Response({'detail': 'Thiếu ID bài tập.'}, status=400)
            
            try:
                exercise_id = int(exercise_id)
                duration = int(duration) if duration else 0
                calories_burned = int(calories_burned) if calories_burned else 0
            except (ValueError, TypeError):
                return Response({'detail': 'Dữ liệu không hợp lệ.'}, status=400)
            
            # Kiểm tra bài tập có tồn tại không
            exercise = Exercise.objects.filter(id=exercise_id).first()
            if not exercise:
                return Response({'detail': 'Không tìm thấy bài tập.'}, status=404)
            
            # Kiểm tra bài tập đã được thêm vào buổi tập chưa
            workout_exercise = WorkoutExercise.objects.filter(
                workout_session=session,
                exercise=exercise
            ).first()
            
            if not workout_exercise:
                return Response({'detail': 'Bài tập chưa được thêm vào buổi tập.'}, status=400)
            
            # Cập nhật thông tin bài tập
            workout_exercise.duration = duration
            workout_exercise.calories_burned = calories_burned
            workout_exercise.save()
            
            print(f"Updated workout exercise: {workout_exercise.id}, Calories: {workout_exercise.calories_burned}")  # Log sau khi cập nhật
            
            # Tính lại tổng calo của buổi tập
            workout_exercises = WorkoutExercise.objects.filter(workout_session=session)
            total_calories = sum(ex.calories_burned for ex in workout_exercises)
            
            print(f"Total calories before update: {session.total_calories}")  # Log tổng calo trước khi cập nhật
            print(f"Calculated total calories: {total_calories}")  # Log tổng calo đã tính
            
            session.total_calories = total_calories
            session.save()
            
            print(f"Updated session total calories: {session.total_calories}")  # Log tổng calo sau khi cập nhật
            
            return Response({
                'detail': 'Hoàn thành bài tập.',
                'workout_exercise': WorkoutExerciseSerializer(workout_exercise).data,
                'total_calories': total_calories
            }, status=200)
            
        except Exception as e:
            print(f"Error in complete_exercise: {str(e)}")  # Log lỗi
            return Response({
                'detail': f'Lỗi khi hoàn thành bài tập: {str(e)}'
            }, status=400)
    
    @action(detail=True, methods=['post'])
    def complete_workout(self, request, pk=None):
        try:
            session = WorkoutSession.objects.filter(pk=pk, user=request.user).first()
            if not session:
                return Response({'detail': 'Không tìm thấy buổi tập.'}, status=404)
            
            print(f"Completing workout session: {session.id}")  # Log ID buổi tập
            
            # Tính lại tổng calo trước khi hoàn thành
            workout_exercises = WorkoutExercise.objects.filter(workout_session=session)
            total_calories = sum(ex.calories_burned for ex in workout_exercises)
            
            print(f"Current total calories: {session.total_calories}")  # Log tổng calo hiện tại
            print(f"Calculated total calories: {total_calories}")  # Log tổng calo đã tính
            
            session.end_time = timezone.now()
            session.is_completed = True
            session.total_calories = total_calories
            session.save()
            
            print(f"Final total calories: {session.total_calories}")  # Log tổng calo cuối cùng
            
            return Response({
                'detail': 'Hoàn thành buổi tập.',
                'total_calories': total_calories
            }, status=200)
            
        except Exception as e:
            print(f"Error in complete_workout: {str(e)}")  # Log lỗi
            return Response({
                'detail': f'Lỗi khi hoàn thành buổi tập: {str(e)}'
            }, status=400)

class HealthMetricsViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_health_metrics(self, request):
        """Lấy các chỉ số sức khỏe hiện tại của người dùng"""
        latest_metrics = HealthMetricsHistory.objects.filter(user=request.user).order_by('-date', '-time').first()
        data = {
            'bmi': request.user.bmi,
            'metrics': HealthMetricsHistorySerializer(latest_metrics).data if latest_metrics else None
        }
        return Response(data)

    def update_water_intake(self, request):
        """Cập nhật lượng nước uống"""
        try:
            amount = float(request.data.get('amount', 0))  # Lượng nước uống thêm (lít)
            today = timezone.now().date()
            # Lấy hoặc tạo bản ghi HealthMetricsHistory cho hôm nay
            history, created = HealthMetricsHistory.objects.get_or_create(
                user=request.user,
                date=today,
                defaults={'water_intake': 0}
            )
            history.water_intake += amount
            history.save()
            return Response(HealthMetricsHistorySerializer(history).data)
        except ValueError:
            return Response({"detail": "Invalid amount value."}, status=400)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

    def update_steps(self, request):
        """Cập nhật số bước đi trong ngày"""
        try:
            steps = int(request.data.get('steps', 0))
            today = timezone.now().date()
            history, created = HealthMetricsHistory.objects.get_or_create(
                user=request.user,
                date=today,
                defaults={'steps': 0}
            )
            history.steps = steps
            history.save()
            return Response(HealthMetricsHistorySerializer(history).data)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

    def update_heart_rate(self, request):
        """Cập nhật nhịp tim trong ngày"""
        try:
            heart_rate = int(request.data.get('heart_rate', 0))
            today = timezone.now().date()
            history, created = HealthMetricsHistory.objects.get_or_create(
                user=request.user,
                date=today,
                defaults={'heart_rate': 0}
            )
            history.heart_rate = heart_rate
            history.save()
            return Response(HealthMetricsHistorySerializer(history).data)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

    def update_bmi(self, request):
        """Cập nhật BMI cho user"""
        try:
            bmi = float(request.data.get('bmi', 0))
            user = request.user
            user.bmi = bmi
            user.save()
            return Response({'bmi': user.bmi})
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

    def get_health_history(self, request):
        """Lấy lịch sử các chỉ số sức khỏe"""
        try:
            user = request.user
            user_id = request.query_params.get('user_id')
            if user.role == 'expert' and user_id:
                # Chỉ cho phép lấy lịch sử của client đã liên kết
                try:
                    client = user.clients.get(id=user_id)
                    user = client
                except User.DoesNotExist:
                    return Response({'detail': 'Bạn không có quyền xem lịch sử sức khỏe user này.'}, status=403)
            elif user.role == 'user' and user_id and int(user_id) != user.id:
                return Response({'detail': 'Bạn không có quyền xem lịch sử sức khỏe người khác.'}, status=403)
            # Lấy lịch sử trong 7 ngày gần nhất
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=7)
            history = HealthMetricsHistory.objects.filter(
                user=user,
                date__range=[start_date, end_date]
            ).order_by('-date', '-time')
            serializer = HealthMetricsHistorySerializer(history, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

class TrainingHistoryView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=6)
        # Lấy lịch tập của user trong 7 ngày gần nhất
        schedules = TrainingSchedule.objects.filter(user=user, date__range=[start_date, end_date])
        # Lấy các session theo schedule
        sessions = TrainingSession.objects.filter(schedule__in=schedules)
        # Gom nhóm theo ngày
        result = []
        for i in range(7):
            day = start_date + timedelta(days=i)
            day_sessions = sessions.filter(schedule__date=day)
            session_count = day_sessions.count()
            total_calories = sum([s.exercise.calories_burned if s.exercise else 0 for s in day_sessions])
            result.append({
                'date': str(day),
                'session_count': session_count,
                'total_calories': total_calories
            })
        return Response(result)

class TrainingStatisticsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user
        user_id = request.GET.get('user_id')
        # Nếu là chuyên gia và có user_id, kiểm tra quyền truy cập client
        if user.role == 'expert' and user_id:
            try:
                client = user.clients.get(id=user_id)
                user = client
            except User.DoesNotExist:
                return Response({'detail': 'Bạn không có quyền xem thống kê user này.'}, status=403)
        elif user.role == 'user' and user_id and int(user_id) != user.id:
            return Response({'detail': 'Bạn không có quyền xem thống kê người khác.'}, status=403)
        today = timezone.now().date()
        data = []
        mode = request.GET.get('mode', 'week')
        if mode == 'week':
            # Lấy ngày đầu tuần (Chủ nhật)
            start_of_week = today - timedelta(days=today.weekday() + 1 if today.weekday() < 6 else 0)
            weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
            for i in range(7):
                day = start_of_week + timedelta(days=i)
                sessions = WorkoutSession.objects.filter(user=user, start_time__date=day)
                session_count = sessions.count()
                total_calories = sessions.aggregate(Sum('total_calories'))['total_calories__sum'] or 0
                data.append({
                    'weekday': weekdays[i],
                    'date': day.strftime('%d/%m'),
                    'session_count': session_count,
                    'total_calories': total_calories
                })
        elif mode == 'month':
            year = today.year
            for month in range(1, 13):
                sessions = WorkoutSession.objects.filter(user=user, start_time__year=year, start_time__month=month)
                session_count = sessions.count()
                total_calories = sessions.aggregate(Sum('total_calories'))['total_calories__sum'] or 0
                data.append({
                    'month': f'{month:02d}/{year}',
                    'session_count': session_count,
                    'total_calories': total_calories
                })
        elif mode == 'year':
            years = WorkoutSession.objects.filter(user=user).dates('start_time', 'year')
            for y in years:
                sessions = WorkoutSession.objects.filter(user=user, start_time__year=y.year)
                session_count = sessions.count()
                total_calories = sessions.aggregate(Sum('total_calories'))['total_calories__sum'] or 0
                data.append({
                    'year': str(y.year),
                    'session_count': session_count,
                    'total_calories': total_calories
                })
        return Response(data)

class WaterSessionListCreateView(generics.ListCreateAPIView):
    serializer_class = WaterSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WaterSession.objects.filter(user=self.request.user).order_by('-date', '-time')

    def perform_create(self, serializer):
        today = timezone.now().date()
        # Lưu session mới
        instance = serializer.save(user=self.request.user, date=today)
        # Tính tổng nước trong ngày
        total = WaterSession.objects.filter(
            user=self.request.user, date=today
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        # Cập nhật hoặc tạo HealthMetricsHistory
        health, created = HealthMetricsHistory.objects.get_or_create(
            user=self.request.user, date=today,
            defaults={'water_intake': total}
        )
        if not created:
            health.water_intake = total
            health.save()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_diet_goal(request):
    serializer = DietGoalSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_diet_goals(request):
    goals = DietGoal.objects.filter(user=request.user, is_active=True)
    serializer = DietGoalSerializer(goals, many=True)
    return Response(serializer.data)

def safe_int(s):
    try:
        return int(s)
    except:
        return 0

def safe_float(s):
    try:
        return float(s)
    except:
        return 0

def generate_nutrition_plan(prompt):
    client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "Bạn là một chuyên gia dinh dưỡng."},
            {"role": "user", "content": prompt}
        ]
    )
    return response.choices[0].message.content

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_meal_plan(request):
    try:
        diet_goal = DietGoal.objects.filter(user=request.user, is_active=True).order_by('-created_at').first()
        prompt = f"""
Tạo một thực đơn dinh dưỡng cho người dùng với mục tiêu {diet_goal.get_goal_type_display()}.
Thông tin người dùng:
- Cân nặng hiện tại: {request.user.weight}kg
- Chiều cao: {request.user.height}cm
- Tuổi: {request.user.age}
- Cân nặng mục tiêu: {diet_goal.target_weight}kg
- Ngày đạt mục tiêu: {diet_goal.target_date}

Yêu cầu:
1. Dòng đầu tiên là TIÊU ĐỀ thực đơn (title), NGẮN GỌN, tối đa 6 từ, không chứa mô tả, không giải thích.
2. Dòng thứ hai là MÔ TẢ tổng quan (1 đoạn ngắn).
3. Dòng thứ ba là tổng dinh dưỡng, ghi rõ: Calo: <số>, Protein: <số>g, Carbs: <số>g, Fat: <số>g
4. Sau đó, lần lượt cho từng bữa ăn (Bữa sáng, Bữa trưa, Bữa tối, Bữa phụ), mỗi bữa gồm:
- Bữa: <loại bữa> (ví dụ: Bữa sáng)
- Tên món: <tên món>
- Mô tả: <mô tả ngắn>
- Calo: <số>
- Protein: <số>g
- Carbs: <số>g
- Fat: <số>g
- Nguyên liệu: <danh sách nguyên liệu, ngăn cách bằng dấu phẩy>
- Cách chế biến: <hướng dẫn ngắn gọn>

Chỉ trả về text thuần, không markdown, không ký tự đặc biệt như *, #, không giải thích thêm, không thêm lời chúc, không thêm bất kỳ thông tin nào ngoài các trường trên.
"""
        # Gọi ChatGPT API
        ai_response = generate_nutrition_plan(prompt)
        # Parse response từ AI và tạo MealPlan
        meal_plan_data = parse_chatgpt_response(ai_response)
        meal_plan = MealPlan.objects.create(
            user=request.user,
            diet_goal=diet_goal,
            title=meal_plan_data['title'],
            description=meal_plan_data['description'],
            total_calories=meal_plan_data['total_calories'],
            protein=meal_plan_data['protein'],
            carbs=meal_plan_data['carbs'],
            fat=meal_plan_data['fat']
        )
        for meal_data in meal_plan_data['meals']:
            Meal.objects.create(
                meal_plan=meal_plan,
                meal_type=meal_data['meal_type'],
                name=meal_data['name'],
                description=meal_data['description'],
                calories=meal_data['calories'],
                protein=meal_data['protein'],
                carbs=meal_data['carbs'],
                fat=meal_data['fat'],
                ingredients=meal_data['ingredients'],
                instructions=meal_data['instructions']
            )
        serializer = MealPlanSerializer(meal_plan)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_meal_plans(request):
    meal_plans = MealPlan.objects.filter(user=request.user, is_active=True)
    serializer = MealPlanSerializer(meal_plans, many=True)
    return Response(serializer.data)

class MealPlanDetailView(generics.RetrieveAPIView):
    serializer_class = MealPlanDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = MealPlan.objects.all()

    def get_queryset(self):
        return MealPlan.objects.filter(user=self.request.user)

def parse_chatgpt_response(response_text):
    print("== RESPONSE TEXT FROM CHATGPT ==")
    print(response_text)
    try:
        lines = [line.strip() for line in response_text.split('\n') if line.strip()]
        title = lines[0] if lines else ''
        description = lines[1] if len(lines) > 1 else ''
        nutrition_info = {'total_calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
        meals = []
        i = 2
        # Parse tổng dinh dưỡng
        if i < len(lines) and 'calo' in lines[i].lower():
            calo_match = re.search(r'Calo\s*[:\-]?\s*(\d+)', lines[i], re.I)
            protein_match = re.search(r'Protein\s*[:\-]?\s*(\d+)', lines[i], re.I)
            carbs_match = re.search(r'Carbs\s*[:\-]?\s*(\d+)', lines[i], re.I)
            fat_match = re.search(r'Fat\s*[:\-]?\s*(\d+)', lines[i], re.I)
            if calo_match:
                nutrition_info['total_calories'] = int(calo_match.group(1))
            if protein_match:
                nutrition_info['protein'] = float(protein_match.group(1))
            if carbs_match:
                nutrition_info['carbs'] = float(carbs_match.group(1))
            if fat_match:
                nutrition_info['fat'] = float(fat_match.group(1))
            i += 1
        # Parse từng bữa ăn
        meal_type_map = {
            'bữa sáng': 'breakfast',
            'bữa trưa': 'lunch',
            'bữa tối': 'dinner',
            'bữa phụ': 'snack',
        }
        while i < len(lines):
            line = lines[i].lower()
            meal_type = None
            for k, v in meal_type_map.items():
                if k in line:
                    meal_type = v
                    break
            if meal_type:
                meal = {'meal_type': meal_type}
                # Đọc các trường tiếp theo
                i += 1
                while i < len(lines) and not any(mt in lines[i].lower() for mt in meal_type_map):
                    l = lines[i]
                    if l.startswith('- Tên món:'):
                        meal['name'] = l.replace('- Tên món:', '').strip()
                    elif l.startswith('- Mô tả:'):
                        meal['description'] = l.replace('- Mô tả:', '').strip()
                    elif l.startswith('- Calo:'):
                        meal['calories'] = int(re.search(r'(\d+)', l).group(1)) if re.search(r'(\d+)', l) else 0
                    elif l.startswith('- Protein:'):
                        meal['protein'] = float(re.search(r'(\d+)', l).group(1)) if re.search(r'(\d+)', l) else 0
                    elif l.startswith('- Carbs:'):
                        meal['carbs'] = float(re.search(r'(\d+)', l).group(1)) if re.search(r'(\d+)', l) else 0
                    elif l.startswith('- Fat:'):
                        meal['fat'] = float(re.search(r'(\d+)', l).group(1)) if re.search(r'(\d+)', l) else 0
                    elif l.startswith('- Nguyên liệu:'):
                        meal['ingredients'] = l.replace('- Nguyên liệu:', '').strip()
                    elif l.startswith('- Cách chế biến:'):
                        meal['instructions'] = l.replace('- Cách chế biến:', '').strip()
                    i += 1
                # Đảm bảo đủ trường
                for f in ['name','description','calories','protein','carbs','fat','ingredients','instructions']:
                    if f not in meal:
                        meal[f] = '' if f in ['name','description','ingredients','instructions'] else 0
                meals.append(meal)
            else:
                i += 1
        # Nếu không có tổng dinh dưỡng, tự tính từ các bữa ăn
        if nutrition_info['total_calories'] == 0:
            nutrition_info['total_calories'] = sum(m.get('calories', 0) for m in meals)
        if nutrition_info['protein'] == 0:
            nutrition_info['protein'] = sum(m.get('protein', 0) for m in meals)
        if nutrition_info['carbs'] == 0:
            nutrition_info['carbs'] = sum(m.get('carbs', 0) for m in meals)
        if nutrition_info['fat'] == 0:
            nutrition_info['fat'] = sum(m.get('fat', 0) for m in meals)
        return {
            'title': title,
            'description': description,
            'total_calories': nutrition_info.get('total_calories', 0),
            'protein': nutrition_info.get('protein', 0),
            'carbs': nutrition_info.get('carbs', 0),
            'fat': nutrition_info.get('fat', 0),
            'meals': meals
        }
    except Exception as e:
        print(f"Error parsing ChatGPT response: {str(e)}")
        # Trả về dữ liệu mẫu nếu có lỗi
        return {
            'title': 'Thực đơn mẫu',
            'description': 'Mô tả thực đơn',
            'total_calories': 2000,
            'protein': 150,
            'carbs': 200,
            'fat': 70,
            'meals': [
                {
                    'meal_type': 'breakfast',
                    'name': 'Bữa sáng mẫu',
                    'description': 'Mô tả bữa sáng',
                    'calories': 500,
                    'protein': 30,
                    'carbs': 50,
                    'fat': 20,
                    'ingredients': 'Nguyên liệu',
                    'instructions': 'Cách chế biến'
                }
            ]
        }

class UserMealPlanListView(generics.ListAPIView):
    serializer_class = MealPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return MealPlan.objects.filter(user=self.request.user).order_by('-created_at')