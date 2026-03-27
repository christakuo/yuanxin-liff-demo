// 檔案位置：api/send-report.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. 接收前端傳來的資料 (現在不需要 userId 了！)
  const { 
    clientName, healthScore, 
    alertTitle1, alertStatus1, alertTitle2, alertStatus2, 
    aiInsight, consultantGreeting 
  } = req.body;

  const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  // 2. 準備 Flex Message 樣板
  const flexMessage = {
    type: "flex",
    altText: "元馨醫管家 - 您的 AI 初步解析報告已出爐",
    contents: {
      "type": "bubble",
      "size": "mega",
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          { "type": "text", "text": "YUANXIN HEALTHCARE", "color": "#20D0A8", "size": "xs", "weight": "bold", "align": "center" },
          { "type": "text", "text": "AI 深度解析報告", "color": "#FFFFFF", "weight": "bold", "size": "xl", "align": "center", "margin": "sm" },
          { "type": "separator", "margin": "lg", "color": "#2A354A" },
          {
            "type": "box", "layout": "horizontal", "contents": [
              {
                "type": "box", "layout": "vertical", "contents": [
                  { "type": "text", "text": clientName, "color": "#FFFFFF", "size": "lg", "weight": "bold" },
                  { "type": "text", "text": "深度解析完成", "color": "#8898AA", "size": "xs", "margin": "sm" }
                ],
                "flex": 2, "justifyContent": "center"
              },
              {
                "type": "box", "layout": "vertical", "contents": [
                  { "type": "text", "text": healthScore, "color": "#20D0A8", "size": "3xl", "weight": "bold", "align": "center" }
                ],
                "flex": 1, "borderColor": "#20D0A8", "borderWidth": "semi-bold", "cornerRadius": "100px", "paddingAll": "sm"
              }
            ],
            "margin": "xl", "alignItems": "center"
          },
          {
            "type": "box", "layout": "horizontal", "contents": [
              {
                "type": "box", "layout": "vertical", "contents": [
                  { "type": "text", "text": alertTitle1, "color": "#8898AA", "size": "xs" },
                  { "type": "text", "text": alertStatus1, "color": "#FF5A5F", "size": "lg", "weight": "bold", "margin": "sm" }
                ],
                "backgroundColor": "#162032", "cornerRadius": "md", "paddingAll": "md", "margin": "sm"
              },
              {
                "type": "box", "layout": "vertical", "contents": [
                  { "type": "text", "text": alertTitle2, "color": "#8898AA", "size": "xs" },
                  { "type": "text", "text": alertStatus2, "color": "#20D0A8", "size": "lg", "weight": "bold", "margin": "sm" }
                ],
                "backgroundColor": "#162032", "cornerRadius": "md", "paddingAll": "md", "margin": "sm"
              }
            ],
            "margin": "xl"
          },
          {
            "type": "box", "layout": "vertical", "contents": [
              { "type": "text", "text": "⚡ 專屬健康洞察", "color": "#FFFFFF", "weight": "bold", "size": "sm" },
              { "type": "text", "text": aiInsight, "color": "#A0ABC0", "size": "xs", "wrap": true, "margin": "md", "lineSpacing": "6px" }
            ],
            "backgroundColor": "#162032", "cornerRadius": "md", "paddingAll": "lg", "margin": "xl"
          },
          {
            "type": "box", "layout": "vertical", "contents": [
              { "type": "text", "text": "💡 醫管家專屬問候", "color": "#20D0A8", "weight": "bold", "size": "sm" },
              { "type": "text", "text": consultantGreeting, "color": "#FFFFFF", "size": "xs", "wrap": true, "margin": "md", "lineSpacing": "4px" }
            ],
            "margin": "xl", "paddingAll": "md"
          }
        ],
        "backgroundColor": "#0B1426", "paddingAll": "xl"
      },
      "footer": {
        "type": "box", "layout": "vertical", "contents": [
          {
            "type": "button",
            "action": { "type": "uri", "label": "預約真人醫管家深度解析", "uri": "https://liff.line.me/2009597152-9nSswjnk" },
            "style": "primary", "color": "#1A73E8"
          }
        ],
        "backgroundColor": "#0B1426", "paddingAll": "xl"
      }
    }
  };

  // 3. 改用 LINE 的 Broadcast (群發) API，完全不需要 User ID！
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        messages: [flexMessage]
      })
    });

    if (response.ok) {
      res.status(200).json({ success: true, message: '成功廣播推播至 LINE' });
    } else {
      const errorData = await response.json();
      res.status(response.status).json({ success: false, error: errorData });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}