import { Request, Response } from 'express';
import Assignment from '../models/Assignment';
import Submission from '../models/Submission';
import AssignmentGroupMembership from '../models/AssignmentGroupMembership';

// @desc    Create a new assignment
// @route   POST /api/assignments
// @access  Private (Teacher only)
export const createAssignment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, groupId, referenceUrl, maxMarks, deadline } = req.body;

        // Validate teacher role
        if (req.user?.role?.toLowerCase() !== 'teacher') {
            res.status(403).json({ success: false, message: 'Only teachers can create assignments' });
            return;
        }

        if (!groupId || typeof groupId !== 'string') {
            res.status(400).json({ success: false, message: 'groupId is required' });
            return;
        }

        const assignment = await Assignment.create({
            title,
            description,
            groupId: groupId.trim().toUpperCase(),
            referenceUrl: referenceUrl?.trim() || null,
            teacher: req.user._id,
            maxMarks,
            deadline: new Date(deadline)
        });

        res.status(201).json({
            success: true,
            data: assignment
        });
    } catch (error) {
        console.error('Create assignment error:', error);
        res.status(500).json({ success: false, message: 'Server error creating assignment' });
    }
};

// @desc    Get all assignments (filtered by role)
// @route   GET /api/assignments
// @access  Private
export const getAllAssignments = async (req: Request, res: Response): Promise<void> => {
    try {
        let assignments;

        if (req.user?.role?.toLowerCase() === 'teacher') {
            // Teachers see only their assignments
            assignments = await Assignment.find({ teacher: req.user._id })
                .populate('teacher', 'name email')
                .sort({ createdAt: -1 });
        } else {
            const requestedGroupId = typeof req.query.groupId === 'string'
                ? req.query.groupId.trim().toUpperCase()
                : undefined;

            // Students see active assignments only for groups they joined.
            const memberships = await AssignmentGroupMembership.find({ student: req.user?._id }).select('groupId');
            const groupIds = memberships.map((membership) => membership.groupId);

            if (requestedGroupId && !groupIds.includes(requestedGroupId)) {
                res.status(403).json({ success: false, message: 'Join this group to view assignments' });
                return;
            }

            const visibleGroupIds = requestedGroupId ? [requestedGroupId] : groupIds;

            assignments = await Assignment.find({ status: 'active', groupId: { $in: visibleGroupIds } })
                .populate('teacher', 'name email')
                .sort({ deadline: 1 });
        }

        res.status(200).json({
            success: true,
            data: assignments
        });
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching assignments' });
    }
};

// @desc    Get assignment by ID
// @route   GET /api/assignments/:id
// @access  Private
export const getAssignmentById = async (req: Request, res: Response): Promise<void> => {
    try {
        const assignment = await Assignment.findById(req.params.id)
            .populate('teacher', 'name email');

        if (!assignment) {
            res.status(404).json({ success: false, message: 'Assignment not found' });
            return;
        }

        if (req.user?.role?.toLowerCase() === 'student') {
            const membership = await AssignmentGroupMembership.findOne({
                student: req.user._id,
                groupId: assignment.groupId
            });

            if (!membership) {
                res.status(403).json({ success: false, message: 'Join this group to access assignment' });
                return;
            }
        }

        res.status(200).json({
            success: true,
            data: assignment
        });
    } catch (error) {
        console.error('Get assignment error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching assignment' });
    }
};

// @desc    Update assignment
// @route   PATCH /api/assignments/:id
// @access  Private (Teacher only - own assignments)
export const updateAssignment = async (req: Request, res: Response): Promise<void> => {
    try {
        const assignment = await Assignment.findById(req.params.id);

        if (!assignment) {
            res.status(404).json({ success: false, message: 'Assignment not found' });
            return;
        }

        // Check if user is the teacher who created this assignment
        if (assignment.teacher.toString() !== req.user?._id.toString()) {
            res.status(403).json({ success: false, message: 'Not authorized to update this assignment' });
            return;
        }

        const { title, description, groupId, referenceUrl, maxMarks, deadline, status } = req.body;

        if (title) assignment.title = title;
        if (description) assignment.description = description;
        if (groupId) assignment.groupId = groupId.toString().trim().toUpperCase();
        if (referenceUrl !== undefined) assignment.referenceUrl = referenceUrl ? referenceUrl.toString().trim() : null;
        if (maxMarks) assignment.maxMarks = maxMarks;
        if (deadline) assignment.deadline = new Date(deadline);
        if (status) assignment.status = status;

        await assignment.save();

        res.status(200).json({
            success: true,
            data: assignment
        });
    } catch (error) {
        console.error('Update assignment error:', error);
        res.status(500).json({ success: false, message: 'Server error updating assignment' });
    }
};

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
// @access  Private (Teacher only - own assignments)
export const deleteAssignment = async (req: Request, res: Response): Promise<void> => {
    try {
        const assignment = await Assignment.findById(req.params.id);

        if (!assignment) {
            res.status(404).json({ success: false, message: 'Assignment not found' });
            return;
        }

        // Check if user is the teacher who created this assignment
        if (assignment.teacher.toString() !== req.user?._id.toString()) {
            res.status(403).json({ success: false, message: 'Not authorized to delete this assignment' });
            return;
        }

        // Delete all submissions for this assignment
        await Submission.deleteMany({ assignment: assignment._id });

        // Delete the assignment
        await assignment.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Assignment and all submissions deleted successfully'
        });
    } catch (error) {
        console.error('Delete assignment error:', error);
        res.status(500).json({ success: false, message: 'Server error deleting assignment' });
    }
};

// @desc    Join an assignment group by group ID
// @route   POST /api/assignments/join-group
// @access  Private (Student only)
export const joinAssignmentGroup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { groupId } = req.body;

        if (req.user?.role?.toLowerCase() !== 'student') {
            res.status(403).json({ success: false, message: 'Only students can join assignment groups' });
            return;
        }

        if (!groupId || typeof groupId !== 'string') {
            res.status(400).json({ success: false, message: 'groupId is required' });
            return;
        }

        const normalizedGroupId = groupId.trim().toUpperCase();

        const hasAssignments = await Assignment.exists({ groupId: normalizedGroupId, status: 'active' });
        if (!hasAssignments) {
            res.status(404).json({ success: false, message: 'No active assignments found for this group ID' });
            return;
        }

        const membership = await AssignmentGroupMembership.findOneAndUpdate(
            { student: req.user._id, groupId: normalizedGroupId },
            { $setOnInsert: { student: req.user._id, groupId: normalizedGroupId } },
            { new: true, upsert: true }
        );

        res.status(200).json({
            success: true,
            message: 'Joined assignment group successfully',
            data: membership
        });
    } catch (error) {
        console.error('Join assignment group error:', error);
        res.status(500).json({ success: false, message: 'Server error joining assignment group' });
    }
};
