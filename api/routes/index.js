const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: "Einflix API funcionando 🚀" });
});

module.exports = router;
