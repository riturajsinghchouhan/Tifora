import express from 'express';
import { authMiddleware } from '../../../../core/auth/auth.middleware.js';
import { requireRoles } from '../../../../core/roles/role.middleware.js';

// Restaurant Controllers
import {
    createTiffinPlan,
    getRestaurantTiffinPlans,
    updateTiffinPlan,
    deleteTiffinPlan,
    getDailyPrepDashboard,
    getUnassignedDeliveries,
    assignDeliveriesToPartner
} from '../controllers/restaurantTiffin.controller.js';

// User Controllers
import {
    getAvailablePlans,
    getPlanById,
    purchaseSubscription,
    getMySubscriptions,
    pauseSubscription,
    resumeSubscription
} from '../controllers/userTiffin.controller.js';

// Delivery Controllers
import {
    getMyTiffinRoute,
    updateDeliveryStatus
} from '../controllers/deliveryTiffin.controller.js';

// Admin Controllers
import {
    getAllSubscriptions,
    getDeliveryPayouts
} from '../controllers/adminTiffin.controller.js';

const router = express.Router();

// --- Restaurant Tiffin Routes ---
router.post('/restaurant/plans', authMiddleware, requireRoles('RESTAURANT'), createTiffinPlan);
router.get('/restaurant/plans', authMiddleware, requireRoles('RESTAURANT'), getRestaurantTiffinPlans);
router.put('/restaurant/plans/:planId', authMiddleware, requireRoles('RESTAURANT'), updateTiffinPlan);
router.delete('/restaurant/plans/:planId', authMiddleware, requireRoles('RESTAURANT'), deleteTiffinPlan);
router.get('/restaurant/prep-dashboard', authMiddleware, requireRoles('RESTAURANT'), getDailyPrepDashboard);
router.get('/restaurant/unassigned-deliveries', authMiddleware, requireRoles('RESTAURANT'), getUnassignedDeliveries);
router.post('/restaurant/assign', authMiddleware, requireRoles('RESTAURANT'), assignDeliveriesToPartner);

// Dual routes for when mounted on /v1/food/restaurant/tiffin
router.post('/plans', authMiddleware, requireRoles('RESTAURANT'), createTiffinPlan);
router.get('/plans', authMiddleware, requireRoles('RESTAURANT'), getRestaurantTiffinPlans);
router.put('/plans/:planId', authMiddleware, requireRoles('RESTAURANT'), updateTiffinPlan);
router.delete('/plans/:planId', authMiddleware, requireRoles('RESTAURANT'), deleteTiffinPlan);
router.get('/prep-dashboard', authMiddleware, requireRoles('RESTAURANT'), getDailyPrepDashboard);
router.get('/unassigned-deliveries', authMiddleware, requireRoles('RESTAURANT'), getUnassignedDeliveries);
router.post('/assign', authMiddleware, requireRoles('RESTAURANT'), assignDeliveriesToPartner);

// --- User Tiffin Routes ---
router.get('/user/plans/available', getAvailablePlans);
router.get('/user/plans/:restaurantId', getAvailablePlans);
router.get('/user/plan/:planId', getPlanById);
router.get('/plans/available', getAvailablePlans);
router.get('/plans/available/:restaurantId', getAvailablePlans);
router.get('/plan/:planId', getPlanById);
router.post('/user/purchase', authMiddleware, requireRoles('USER'), purchaseSubscription);
router.post('/purchase', authMiddleware, requireRoles('USER'), purchaseSubscription);
router.get('/user/my-subscriptions', authMiddleware, requireRoles('USER'), getMySubscriptions);
router.get('/my-subscriptions', authMiddleware, requireRoles('USER'), getMySubscriptions);
router.post('/user/:subscriptionId/pause', authMiddleware, requireRoles('USER'), pauseSubscription);
router.post('/user/:subscriptionId/resume', authMiddleware, requireRoles('USER'), resumeSubscription);
router.post('/:subscriptionId/pause', authMiddleware, requireRoles('USER'), pauseSubscription);
router.post('/:subscriptionId/resume', authMiddleware, requireRoles('USER'), resumeSubscription);

// --- Delivery Partner Tiffin Routes ---
router.get('/delivery/my-route', authMiddleware, requireRoles('DELIVERY_PARTNER'), getMyTiffinRoute);
router.put('/delivery/:deliveryId/status', authMiddleware, requireRoles('DELIVERY_PARTNER'), updateDeliveryStatus);
router.get('/my-route', authMiddleware, requireRoles('DELIVERY_PARTNER'), getMyTiffinRoute);
router.put('/:deliveryId/status', authMiddleware, requireRoles('DELIVERY_PARTNER'), updateDeliveryStatus);

// --- Admin Tiffin Routes ---
router.get('/admin/subscriptions', authMiddleware, requireRoles('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'), getAllSubscriptions);
router.get('/admin/payout-logs', authMiddleware, requireRoles('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'), getDeliveryPayouts);
router.get('/subscriptions', authMiddleware, requireRoles('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'), getAllSubscriptions);
router.get('/payout-logs', authMiddleware, requireRoles('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'), getDeliveryPayouts);

export default router;
