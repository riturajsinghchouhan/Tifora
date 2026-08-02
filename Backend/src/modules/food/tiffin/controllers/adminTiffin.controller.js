import { TiffinSubscription } from '../models/tiffinSubscription.model.js';
import { TiffinDelivery } from '../models/tiffinDelivery.model.js';
import mongoose from 'mongoose';

export const getAllSubscriptions = async (req, res) => {
    try {
        const subscriptions = await TiffinSubscription.find({})
            .populate('userId', 'name phone')
            .populate('restaurantId', 'name')
            .populate('planId', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: subscriptions });
    } catch (error) {
        console.error('Error fetching all subscriptions:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getDeliveryPayouts = async (req, res) => {
    try {
        const { startDate, endDate, partnerId } = req.query;
        
        let matchStage = {
            status: { $in: ['delivered', 'delivered_unattended'] }
        };

        if (startDate && endDate) {
            matchStage.date = { 
                $gte: new Date(startDate), 
                $lte: new Date(endDate) 
            };
        }

        if (partnerId) {
            matchStage.assignedTo = new mongoose.Types.ObjectId(partnerId);
        }

        const payouts = await TiffinDelivery.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$assignedTo',
                    totalDeliveries: { $sum: 1 },
                    // Assuming flat 20 Rs per tiffin delivery for now
                    totalEarnings: { $sum: { $ifNull: ['$deliveryEarning', 20] } } 
                }
            },
            {
                $lookup: {
                    from: 'food_delivery_partners', // Existing delivery partner collection
                    localField: '_id',
                    foreignField: '_id',
                    as: 'partnerDetails'
                }
            },
            { $unwind: '$partnerDetails' },
            {
                $project: {
                    partnerId: '$_id',
                    partnerName: '$partnerDetails.name',
                    partnerPhone: '$partnerDetails.phone',
                    totalDeliveries: 1,
                    totalEarnings: 1,
                    _id: 0
                }
            }
        ]);

        res.status(200).json({ success: true, data: payouts });
    } catch (error) {
        console.error('Error calculating payouts:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getDeliveryBoyPayoutLogs = getDeliveryPayouts;

