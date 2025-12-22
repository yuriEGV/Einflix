import mercadopago from 'mercadopago';

// Configurar SDK de Mercado Pago
// En un entorno real, usarías process.env.MP_ACCESS_TOKEN
mercadopago.configurations.setAccessToken(process.env.MP_ACCESS_TOKEN || 'TEST-3392348560888206-122208-144d15655c654f164624446345839444-12345678');

export async function iniciarPago(req, res) {
  try {
    const { items, back_urls } = req.body;

    // Crear la preferencia
    const preference = {
      items: items || [
        {
          title: 'Suscripción Einflix',
          unit_price: 5000,
          quantity: 1,
        }
      ],
      back_urls: back_urls || {
        success: `${process.env.BASE_URL}/api/payment/feedback`,
        failure: `${process.env.BASE_URL}/api/payment/feedback`,
        pending: `${process.env.BASE_URL}/api/payment/feedback`
      },
      auto_return: 'approved',
    };

    const response = await mercadopago.preferences.create(preference);
    res.json({ id: response.body.id, init_point: response.body.init_point });
  } catch (error) {
    console.error('Error creando preferencia MP:', error);
    res.status(500).json({ error: 'No se pudo iniciar el pago' });
  }
}

export async function callbackFeedback(req, res) {
  const { payment_id, status, merchant_order_id } = req.query;

  if (status === 'approved') {
    // Aquí actualizarías el estado del usuario en la BD
    console.log(`Pago aprobado: ${payment_id}`);
    // Podrías redirigir a una página de éxito en el frontend
    res.redirect(`${process.env.FRONTEND_URL}/gallery?payment=success`);
  } else {
    res.redirect(`${process.env.FRONTEND_URL}/payment?payment=failed`);
  }
}


