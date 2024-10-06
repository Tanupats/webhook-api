const stripe = require('stripe')('sk_test_51PwwqUP4dsV4q4uV0lPjG8o5KpV5BOrf5v8ZaHOTdUYxQUszZtU9M0uFigIbZkGsiL4Y7ZvSJSoHaRcUPHjXi1SS00KyhoHfhp');
const endpointSecret = process.env.STRITE_WEBHOOKS;
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
app.use(cors());
app.use(express.json());
app.use(bodyParser.json()); // สำหรับ JSON
app.use(bodyParser.urlencoded({ extended: true })); // สำหรับ URL-encoded
app.use(bodyParser.raw({ type: 'application/json' })); // สำหรับ raw body (เช่
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const dayjs = require('dayjs');
//api 
app.get('/', (req, res) => {

    res.send({ msg: 'api v1' })
})

//บันทึกคำสั่งซื้อ 
app.post('/payment', async (req, res) => {
    let body = req.body;
    console.log('body', body)
    const result = await prisma.payment.create({ data: body });
    if (result) {
        res.send(result)
    }

})

//gat all payment 
app.get('/payment', async (req, res) => {
    const result = await prisma.payment.findMany();
    if (result) {
        res.send(result)
    }
})

app.get('/payment/:id', async (req, res) => {
    const result = await prisma.payment.findUnique({ where: { id: req.params.id } });
    res.send(result)
})


//เช็คเอาท์แพคเกจ 30 วัน
app.post('/checkout-package1', async (req, res) => {
    // gte paymentId from submit chckout 
    try {
        // Create Checkout Sessions from body params.
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
                    price: 'price_1PxOdVP4dsV4q4uV06LkBAw7',
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.origin}/?success=true`,
            cancel_url: `${req.headers.origin}/?canceled=true`,
        });
        res.redirect(303, session.url);
    } catch (err) {
        res.status(err.statusCode || 500).json(err.message);
    }
})


//อัพเดตข้อมูลผู้ใช้เมื่อจ่ายเงินสำเร็จ
const updatePackageSubject = async (data) => {
    const startDate = dayjs(data.createdAt);
    const expiryDate = startDate.add(data.day, 'day');
    const formattedExpiryDate = expiryDate.toISOString();
    const body = { exp: formattedExpiryDate, subject: data?.subjects };
    await fetch(`${process.env.API_DEV}/users/update-package/${data.user_id}`, 
        {
        method: 'PUT', body: JSON.stringify(body), 
        headers: { 'Content-Type': 'application/json' } }).then((res) => res.json()).then((data) => {
        console.log('update my package', data);
    })
};


app.post('/api/webhooks', express.raw({ type: 'application/json' }), async (request, response) => {

    const data = request.body
    let event = JSON.stringify(data)
    //console.log(event)
    let eventObject = JSON.parse(event);
    if (endpointSecret) {
        const signature = request.headers['stripe-Signature'];
        try {
            event = stripe.webhooks.constructEvent(
                request.body,
                signature,
                endpointSecret
            );
        } catch (err) {
            console.log(`⚠️  Webhook signature verification failed.`, err.message);
            return response.sendStatus(400);
        }
    }


    switch (eventObject.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = eventObject.data.object;
            console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
            console.log(`receipt_email for ${paymentIntent.receipt_email}`);

            // ใช้ async/await เพื่อให้ prisma ทำงาน
            try {
                // ดึงข้อมูลการชำระเงินล่าสุดของ email นั้น
                const getPayment = await prisma.payment.findFirst({
                    where: { username: paymentIntent.receipt_email },
                    orderBy: { createdAt: 'desc' },  // จัดเรียงตาม createdAt จากใหม่ไปเก่า
                });

                console.log(getPayment);

                if (getPayment) {
                    // อัปเดตสถานะการชำระเงิน
                    const update = await prisma.payment.update({
                        where: { id: getPayment.id },
                        data: { status: true }
                    });


                    updatePackageSubject(update);
                    console.log(update);
                } else {
                    console.log('ไม่พบข้อมูลการชำระเงินล่าสุด');
                }
            } catch (error) {
                console.error('Error updating payment:', error);
            }

            break;
    }
    // Return a 200 response to acknowledge receipt of the event
    response.send();
});
// กำหนด port ให้ server รัน
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
