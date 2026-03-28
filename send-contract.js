// 檔案位置：api/send-contract.js
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // 只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. 接收前端(報名表單)傳來的候選人資料
  const { name, email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // 2. 設定 Gmail 發信機
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  // 3. 撰寫信件內容 (支援 HTML 精美排版)
  const mailOptions = {
    from: `"元馨醫管家 營運團隊" <${process.env.GMAIL_USER_EMAIL}>`,
    to: email,
    subject: '【元馨醫管家】健康顧問合作意願 - 專屬合約與執行手冊',
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #20D0A8;">親愛的 ${name || '健康顧問'} 您好：</h2>
        <p>非常感謝您填寫「元馨醫管家」健康顧問合作意願表！</p>
        <p>我們非常期待您的加入，與我們一同推廣預防醫學的理念。附件與雲端連結為我們為您準備的專屬資料：</p>
        
        <div style="background-color: #F8FAFC; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;">📘 <strong>《健康顧問工作說明書及執行手冊》</strong><br>
          <span style="font-size: 14px; color: #666;">（請先詳細閱讀，了解我們的核心理念、健康管理方案價值與服務流程）</span></p>
        </div>

        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        
        <h3 style="color: #1A73E8;">✅ 下一步行動：線上簽署合約</h3>
        <p>若您已閱讀完畢並同意我們的合作模式，請點擊下方連結，完成線上《健康顧問合約書》簽署，並繳交您的獎金匯款帳戶資料：</p>
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="https://health-consultant-contract.netlify.app/" style="display: inline-block; padding: 12px 24px; background-color: #1A73E8; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; letter-spacing: 1px;">前往簽署顧問合約書</a>
        </p>
        
        <p>完成簽署後，系統將會為您開通專屬的收款 QR Code 與推薦碼！</p>
        <br>
        <p style="color: #8898AA; font-size: 14px;">元馨醫管家 營運團隊 敬上</p>
      </div>
    `
  };

  // 4. 寄出信件
  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: '合約信件已成功寄出！' });
  } catch (error) {
    console.error('發信失敗:', error);
    res.status(500).json({ success: false, error: '信件寄送失敗，請稍後再試。' });
  }
}