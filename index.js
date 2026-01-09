require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const gTTS = require('gtts');
const path = require('path');
const fs = require('fs');

const app = express().use(bodyParser.json());

// --- الإعدادات الأساسية ---
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = "MY_TOKEN_123"; // الكلمة التي ستضعها في إعدادات Meta

// --- 1. استقبال رسائل الـ Webhook ---
app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

app.post('/webhook', (req, res) => {
    let body = req.body;

    if (body.object === 'page') {
        body.entry.forEach(entry => {
            let webhook_event = entry.messaging[0];
            let sender_id = webhook_event.sender.id;

            // إذا أرسل المستخدم نصاً
            if (webhook_event.message && webhook_event.message.text) {
                handleMessage(sender_id, webhook_event.message.text);
            }
            
            // إذا انضم عضو جديد للمجموعة
            if (webhook_event.message && webhook_event.message.new_chat_members) {
                sendTextMessage(sender_id, "أهلاً بك يا بطل في مجموعتنا! نورتنا.");
            }
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// --- 2. معالج الأوامر (Logic) ---
function handleMessage(sender_id, text) {
    let msg = text.toLowerCase();

    // أمر الحماية البسيط
    const bannedWords = ['شتيمة1', 'شتيمة2']; 
    if (bannedWords.some(word => msg.includes(word))) {
        return sendTextMessage(sender_id, "⚠️ تحذير: يرجى الالتزام بأدب الحوار.");
    }

    // أمر تحويل النص لصوت (TTS)
    if (msg.startsWith('/say ')) {
        let speechText = text.slice(5);
        return sendVoiceMessage(sender_id, speechText);
    }

    // أوامر عامة
    if (msg === '/help') {
        return sendTextMessage(sender_id, "الأوامر المتاحة:\n/say [نص] - لتحويل النص لصوت\n/id - لمعرفة معرفك\n/rank - لنقاطك");
    }
}

// --- 3. وظائف الإرسال (Actions) ---

// إرسال نص
function sendTextMessage(recipientId, text) {
    axios.post(`https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        recipient: { id: recipientId },
        message: { text: text }
    }).catch(err => console.log('Error sending text:', err.response.data));
}

// إرسال صوت (TTS)
function sendVoiceMessage(recipientId, text) {
    const gtts = new gTTS(text, 'ar');
    const fileName = `voice_${recipientId}.mp3`;
    
    gtts.save(fileName, (err) => {
        if (err) return console.error(err);
        console.log("تم إنشاء ملف الصوت، جاهز للإرسال...");
        // ملحوظة: لإرسال ملفات حقيقية، ستحتاج لرفعها على رابط مباشر أولاً
        sendTextMessage(recipientId, `🔊 (تجريبي) كنت تريد قول: "${text}"`);
    });
}

const PORT = process.env.PORT || 1337;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
