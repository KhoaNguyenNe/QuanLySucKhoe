from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Chỉ cho phép chủ sở hữu (user) xem/sửa dữ liệu của chính mình.
    Chuyên gia chỉ được xem (read-only).
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            # Chuyên gia có thể xem thông tin của user khác
            return True
        # Chỉ user mới được sửa/xóa dữ liệu của mình
        return obj.user == request.user or obj == request.user

class IsExpert(permissions.BasePermission):
    """
    Chỉ cho phép chuyên gia truy cập.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'expert'

class IsOwnerOrExpert(permissions.BasePermission):
    """
    Chỉ cho phép user thao tác với dữ liệu của mình hoặc chuyên gia được xem dữ liệu của user khác.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'expert':
            return True  # Chuyên gia được phép xem
        return obj.user == request.user or obj == request.user 
    