/**
 * CORS対応: OPTIONSリクエストを処理
 */
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '3600');
}

/**
 * Node.js側からのPOSTリクエストを受け取り、スプレッドシートへ一括登録する
 */
function doPost(e) {
  // CORSヘッダーを追加
  const output = ContentService.createTextOutput('');
  output.setMimeType(ContentService.MimeType.TEXT);
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  try {
    // リクエストボディをパース
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    const now = new Date();
    
    // JSON配列をスプレッドシート用の2次元配列（行データ）に変換
    // JSONのキー名と順番をスプレッドシートの列に合わせて配置します
    const rows = data.map(item => [
      item.registeredAt,  // A列: 登録日時
      item.dish_name,     // B列: 料理名
      item.comment,       // C列: 解析コメント
      item.calorie,       // D列: カロリー
      item.protein,       // E列: タンパク質(P)
      item.fat,           // F列: 脂質(F)
      item.carbohydrate,  // G列: 炭水化物(C)
      item.confidence     // H列: 確信度
    ]);
    
    // データの書き込み範囲を特定して一括挿入
    // getRange(開始行, 開始列, 行数, 列数)
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, rows.length, rows[0].length).setValues(rows);
    
    // 成功レスポンスを返す
    output.setContent(JSON.stringify({ 
      status: 'success', 
      message: `${rows.length}件の料理を登録しました` 
    }));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
      
  } catch (error) {
    // エラーレスポンス
    output.setContent(JSON.stringify({ 
      status: 'error', 
      message: error.toString() 
    }));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
  }
}