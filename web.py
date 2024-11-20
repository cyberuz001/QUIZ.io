import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
import requests
from prettytable import PrettyTable

# Logging sozlamalari
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

API_URL = "http://localhost:3000/api"
TOKEN = "5800503622:AAGHFMPk57wBv8d-bu88i39Q4EelitcnjgQ"  # Bot tokeningizni yozing
WEB_APP_URL = "http://127.0.0.1:5500/login.html"  # Veb-ilova manzilingizni kiriting
ADMIN_ID = 5944975917  # Admin ID-ni kiriting

# /start buyrug'i
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    await update.message.reply_text(
        f"Salom, {user.first_name}! Botga xush kelibsiz! Testlarni boshlash yoki natijalarni ko'rish uchun tegishli buyruqlarni yuboring.\n\n"
        "Veb-ilovaga o'tish uchun /web buyrug'ini yuboring."
    )

# /natija buyrug'i - admin uchun natijalarni ko'rish
async def get_results(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if user.id != ADMIN_ID:
        await update.message.reply_text("Bu buyruq faqat admin uchun.")
        return
    
    response = requests.get(f"{API_URL}/students-list")
    if response.status_code == 200:
        students = response.json()
        table = PrettyTable()
        table.field_names = ["ID", "Ism", "Familiya", "Login", "Parol", "To'g'ri", "Noto'g'ri", "Jami"]
        for student in students:
            table.add_row([
                student['id'],
                student['name'],
                student['surname'],
                student['username'],
                student['password'],
                student['correct_answers'],
                student['wrong_answers'],
                student['total_tests']
            ])
        await update.message.reply_text(f"<pre>{table}</pre>", parse_mode='HTML')
    else:
        await update.message.reply_text("Xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.")

# /web buyrug'i - Telegram Web App orqali o'tish
async def open_web(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    keyboard = [
        [InlineKeyboardButton("Web App-ni ochish", web_app=WebAppInfo(url=WEB_APP_URL))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        "Telegram Web App-ni ochish uchun quyidagi tugmani bosing:",
        reply_markup=reply_markup,
    )

# Foydalanuvchining javoblarini qabul qilish
async def handle_answer(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    answer = update.message.text.upper()
    if answer not in ['A', 'B', 'C', 'D']:
        await update.message.reply_text("Noto'g'ri javob formati. Iltimos, A, B, C yoki D ni tanlang.")
        return
    
    test_id = context.user_data.get('current_test')
    if not test_id:
        await update.message.reply_text("Avval testni boshlang.")
        return
    
    response = requests.post(f"{API_URL}/submit-test", 
                             headers={"Authorization": f"Bearer {user.id}"},
                             json={"questionId": test_id, "answer": answer})
    
    if response.status_code == 200:
        await update.message.reply_text("Javobingiz qabul qilindi. Keyingi test uchun davom eting.")
        del context.user_data['current_test']
    else:
        await update.message.reply_text("Xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.")

# Botni ishga tushirish
def main() -> None:
    application = Application.builder().token(TOKEN).build()

    # Buyruqlarni qo'shish
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("natija", get_results))
    application.add_handler(CommandHandler("web", open_web))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_answer))

    application.run_polling()

if __name__ == "__main__":
    main()
