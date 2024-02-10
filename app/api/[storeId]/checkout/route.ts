// import Stripe from "stripe";
// import { NextResponse } from "next/server";

// import { stripe } from "@/lib/stripe";
// import prismadb from "@/lib/prismadb";

// const corsHeaders = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
//   "Access-Control-Allow-Headers": "Content-Type, Authorization",
// };

// export async function OPTIONS() {
//   return NextResponse.json({}, { headers: corsHeaders });
// }

// export async function POST(
//   req: Request,
//   { params }: { params: { storeId: string } }
// ) {
//   const { productIds } = await req.json();

//   if (!productIds || productIds.length === 0) {
//     return new NextResponse("Product ids are required", { status: 400 });
//   }

//   const products = await prismadb.product.findMany({
//     where: {
//       id: {
//         in: productIds
//       }
//     }
//   });

//   const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

//   products.forEach((product : any) => {
//     line_items.push({
//       quantity: 1,
//       price_data: {
//         currency: 'USD',
//         product_data: {
//           name: product.name,
//         },
//         unit_amount: product.price.toNumber() * 100
//       }
//     });
//   });

//   const order = await prismadb.order.create({
//     data: {
//       storeId: params.storeId,
//       isPaid: false,
//       orderItems: {
//         create: productIds.map((productId: string) => ({
//           product: {
//             connect: {
//               id: productId
//             }
//           }
//         }))
//       }
//     }
//   });

//   const session = await stripe.checkout.sessions.create({
//     line_items,
//     mode: 'payment',
//     billing_address_collection: 'required',
//     phone_number_collection: {
//       enabled: true,
//     },
//     success_url: `${process.env.FRONTEND_STORE_URL}/cart?success=1`,
//     cancel_url: `${process.env.FRONTEND_STORE_URL}/cart?canceled=1`,
//     metadata: {
//       orderId: order.id
//     },
//   });

//   return NextResponse.json({ url: session.url }, {
//     headers: corsHeaders
//   });
// };

import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';

import prismadb from '@/lib/prismadb';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const razorpay = new Razorpay({
  key_id: '',
  key_secret: '',
});

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request, { params }: { params: { storeId: string } }) {
  const { productIds } = await req.json();

  if (!productIds || productIds.length === 0) {
    return new NextResponse('Product ids are required', { status: 400 });
  }

  const products = await prismadb.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
  });

  const orderAmount = products.reduce((total : any, product : any) => total + product.price.toNumber(), 0) * 100;

  const options = {
    amount: orderAmount,
    currency: 'INR', // Adjust as per your requirement
    receipt: 'order_rcptid_11',
    payment_capture: 1,
  };

  try {
    const razorpayOrder = await razorpay.orders.create(options);

    const order = await prismadb.order.create({
      data: {
        storeId: params.storeId,
        isPaid: false,
        orderItems: {
          create: productIds.map((productId: string) => ({
            product: {
              connect: {
                id: productId,
              },
            },
          })),
        },
      },
    });

    return NextResponse.json({ orderId: order.id, razorpayOrder }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return new NextResponse('Error creating Razorpay order', { status: 500 });
  }
}
