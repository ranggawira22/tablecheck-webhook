const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Buat folder logs jika belum ada
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Fungsi untuk menyimpan log ke file
function saveLogToFile(filename, data) {
  const timestamp = new Date().toISOString();
  const logPath = path.join(logsDir, filename);
  
  const logEntry = `\n\n=== ${timestamp} ===\n${JSON.stringify(data, null, 2)}`;
  
  fs.appendFile(logPath, logEntry, (err) => {
    if (err) {
      console.error(`Error writing to log file ${filename}:`, err);
    } else {
      console.log(`Log saved to ${filename}`);
    }
  });
}

// Route untuk halaman utama
app.get('/', (req, res) => {
  res.send('TableCheck Webhook App for Potato Head Bali is running!');
});

// Route untuk mendaftarkan webhook ke TableCheck
app.post('/api/register-webhook', async (req, res) => {
  try {
    const franchiseId = process.env.FRANCHISE_ID;
    const shopId = process.env.SHOP_ID;
    const callbackUrl = process.env.WEBHOOK_CALLBACK_URL;
    const apiKey = process.env.TABLECHECK_API_KEY;
    
    const requestData = {
      callback_method: "post",
      callback_url: callbackUrl,
      callback_auth_method: "none",
      callback_oauth_url: "",
      callback_username: "",
      callback_password: "",
      franchise_ids: [franchiseId],
      shop_ids: [shopId]
    };
    
    // Log request
    saveLogToFile('register_webhook_request.txt', requestData);
    
    const response = await axios.post(`${process.env.TABLECHECK_API_URL}/api/sync/v1/webhooks`, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    // Log response
    saveLogToFile('register_webhook_response.txt', response.data);
    
    res.status(200).json({
      success: true,
      message: 'Webhook registered successfully with TableCheck',
      data: response.data
    });
  } catch (error) {
    // Log error
    const errorData = {
      message: error.message,
      response: error.response?.data || 'No response data'
    };
    saveLogToFile('register_webhook_error.txt', errorData);
    
    console.error('Error registering webhook:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to register webhook',
      error: error.response?.data || error.message
    });
  }
});

// Route untuk menerima webhook dari TableCheck
app.post('/api/webhook-receiver', (req, res) => {
  try {
    // Log data yang diterima dari TableCheck
    console.log('Webhook received from TableCheck:', JSON.stringify(req.body, null, 2));
    
    // Simpan request ke file
    saveLogToFile('webhook_received.txt', {
      headers: req.headers,
      body: req.body
    });
    
    // Di sini Anda dapat menambahkan logika untuk memproses data
    // contoh: update database, kirim notifikasi, dll.
    
    const responseData = {
      success: true,
      message: 'Webhook received and processed successfully',
      timestamp: new Date().toISOString()
    };
    
    // Simpan response ke file
    saveLogToFile('webhook_response.txt', responseData);
    
    // Selalu berikan respons sukses ke TableCheck
    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Log error
    saveLogToFile('webhook_error.txt', {
      message: error.message,
      stack: error.stack
    });
    
    // Tetap berikan respons 200 agar TableCheck tahu bahwa webhook telah diterima
    const errorResponse = {
      success: false,
      message: 'Webhook received but processing failed',
      error: error.message
    };
    
    // Simpan error response ke file
    saveLogToFile('webhook_error_response.txt', errorResponse);
    
    res.status(200).json(errorResponse);
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Logs will be saved to: ${logsDir}`);
});