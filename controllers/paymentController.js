import axios from 'axios';

const WEBPAY_API_URL = process.env.WEBPAY_API_URL || 'https://webpay3gint.transbank.cl/rswebpaytransaction/api/webpay/v1.3';
const WEBPAY_API_KEY_ID = process.env.WEBPAY_API_KEY_ID || 'tu-tbk-id-aqui';
const WEBPAY_API_KEY_SECRET = process.env.WEBPAY_API_KEY_SECRET || 'tu-clave-secreta-aqui';

function webpayHeaders() {
  return {
    'Tbk-Api-Key-Id': WEBPAY_API_KEY_ID,
    'Tbk-Api-Key-Secret': WEBPAY_API_KEY_SECRET,
    'Content-Type': 'application/json',
  };
}

export async function iniciarPago(req, res) {
  try {
    const { buy_order, session_id, amount, return_url } = req.body;
    const payload = {
      buy_order,
      session_id,
      amount,
      return_url, // Donde Webpay regresará después del pago.
    };
    const resp = await axios.post(
      `${WEBPAY_API_URL}/transactions`,
      payload,
      { headers: webpayHeaders() }
    );
    res.json(resp.data); // Incluye token y url
  } catch (error) {
    console.error('Error creando transacción webpay', error.response?.data || error.message);
    res.status(500).json({ error: 'No se pudo iniciar el pago', detalle: error.response?.data || error.message });
  }
}

export async function callbackExitoso(req, res) {
  try {
    const { token_ws } = req.body || req.query;
    // Consultar el estado de la transacción confirmada
    const url = `${WEBPAY_API_URL}/transactions/${token_ws}`;
    const resp = await axios.put(url, {}, { headers: webpayHeaders() });
    // Aquí puedes actualizar la BD según el resultado
    res.json({ status: 'pagado', result: resp.data });
  } catch (error) {
    res.status(400).json({ error: 'No se pudo chequear pago', detalle: error.response?.data || error.message });
  }
}

export async function callbackError(req, res) {
  // Manejo de error en pago
  res.status(400).json({ status: 'error', detalle: (req.body || req.query) });
}


