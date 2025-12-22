import User from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });

  } catch (error) {
    res.status(500).json({ error: 'Error registering user' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.status(200).json({ token });

  } catch (error) {
    res.status(500).json({ error: 'Error logging in user' });
  }
}

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Por seguridad, no decimos si el email existe o no
      return res.status(200).json({ message: 'Si el correo existe, recibirá un enlace de recuperación.' });
    }

    // Aquí iría la lógica de generar un token y enviarlo por email
    console.log(`Recuperación de contraseña solicitada para: ${email}`);

    res.status(200).json({ message: 'Funcionalidad de recuperación en desarrollo. Contacte al soporte.' });
  } catch (error) {
    res.status(500).json({ error: 'Error procesando solicitud' });
  }
}


