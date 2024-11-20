# numbers = [ 10, 23, 45, 67, 2, 90, 4]

# max_numbers = numbers[0]
# for num in numbers:
#     if num > max_numbers:
#         max_numbers = num

# print(f'eng katta son {max_numbers}')





# numbers = [ 10, 23, 45, 67,88, 2, 90, 4]



# n = len(numbers)


# for i in range(n):
#     for j in range(0, n-i-1):
#         if numbers[j] > numbers[j + 1]:
#             numbers[j],numbers[j + 1] = numbers[j], numbers[j]


# print(f"saralangan ro'yhat {numbers}")




def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

numbers = [11, 22, 25, 34, 64, 90]
target = int(input("Qidirilayotgan sonni kiriting: "))
result = binary_search(numbers, target)

if result != -1:
    print(f"Son ro'yxatning {result}-o'rnida joylashgan.")
else:
    print("Son topilmadi.")
