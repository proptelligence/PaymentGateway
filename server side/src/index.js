require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000; // Use environment variable for PORT

// Access API keys from environment variables
const APP_ID = process.env.APP_ID;
const SECRET_KEY = process.env.SECRET_KEY;

// In-memory cart (for demo purposes; in production, you would use a database)
let cart = []; // Initialize an empty cart for storing items

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Cashfree Token Generation Route
app.post('/createOrder', async (req, res) => {
    const { orderAmount, customerName, customerEmail, customerPhone, customerId } = req.body;

    console.log('Request Payload:', {
        orderAmount,
        customerName,
        customerEmail,
        customerPhone,
        customerId
    });

    const orderId = `order_${Math.floor(Math.random() * 1000000)}`;  // Use backticks for template string
    const apiEndpoint = 'https://api.cashfree.com/pg/orders';

    const headers = {
        'Content-Type': 'application/json',
        'x-client-id': APP_ID,
        'x-client-secret': SECRET_KEY,
        'x-api-version': '2022-09-01'
    };

    const payload = {
        order_id: orderId,
        order_amount: orderAmount,
        order_currency: 'INR',  // Ensure currency is correctly specified
        customer_details: {
            customer_id: customerId,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone
        }
    };

    try {
        const response = await axios.post(apiEndpoint, payload, { headers });
        console.log('API Response:', response.data);

        if (response.data && response.data.payment_session_id) {
            // Store order details in the cart (for demonstration purposes)
            cart.push({
                orderId,
                orderAmount,
                customerDetails: { customerId, customerName, customerEmail, customerPhone },
                purchased: false // Initially set purchased to false
            });

            res.json({
                orderId: response.data.order_id,
                cfOrderId: response.data.cf_order_id,
                paymentSessionId: response.data.payment_session_id,
                customerDetails: response.data.customer_details
            });
        } else {
            console.log('Error in API response:', response.data);
            res.status(400).json({ error: 'Failed to create order', details: response.data });
        }
    } catch (error) {
        console.error('Error creating order token:', error.message);
        if (error.response) {
            console.log('Error details:', error.response.data);
            res.status(500).json({ error: 'Cashfree API Error', details: error.response.data });
        } else {
            res.status(500).json({ error: 'Internal Server Error', details: error.message });
        }
    }
});

// Confirm Payment Route
app.post('/confirmPayment', (req, res) => {
    const { orderId, status } = req.body; // Extract orderId and payment status from the request body

    if (status === 'SUCCESS') {
        // Update cart to mark as purchased
        const orderIndex = cart.findIndex(item => item.orderId === orderId);
        if (orderIndex > -1) {
            cart[orderIndex].purchased = true; // Mark the item as purchased
            res.json({ message: 'Payment confirmed, cart updated.' });
        } else {
            res.status(404).json({ error: 'Order not found in cart.' });
        }
    } else {
        res.status(400).json({ error: 'Payment was not successful.' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);  // Proper backticks for string interpolation
});
