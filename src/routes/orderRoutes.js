const express = require('express');
const { createOrder, getOrderById, updateOrder, getAllOrders, TrackOrder, myOrders, deleteOrder, orderStats, recentOrders } = require('../controllers/orderController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

router.get('/track/:id', TrackOrder);

router.use(authMiddleware);

router
  .post('/', createOrder)
  .get('/my-orders', myOrders)
  .get('/:id', getOrderById)
  .get('/', getAllOrders)
  .put('/:id', updateOrder)
  .delete('/:id', deleteOrder)

module.exports = router;
