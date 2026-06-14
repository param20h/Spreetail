const express = require('express');
const { body } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(auth);

// GET /groups
router.get('/', async (req, res, next) => {
  try {
    const userGroups = await db('group_members')
      .join('groups', 'group_members.group_id', 'groups.id')
      .where('group_members.user_id', req.user.id)
      .select('groups.id', 'groups.name', 'group_members.joined_at', 'group_members.left_at', 'groups.created_at');

    res.json(userGroups);
  } catch (err) {
    next(err);
  }
});

// POST /groups
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Group name is required')
  ],
  validate,
  async (req, res, next) => {
    const { name } = req.body;

    try {
      const result = await db.transaction(async (trx) => {
        const [group] = await trx('groups')
          .insert({ name })
          .returning('*');

        // Add creator as member
        await trx('group_members').insert({
          group_id: group.id,
          user_id: req.user.id,
          joined_at: new Date().toISOString().split('T')[0]
        });

        return group;
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /groups/:id
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const group = await db('groups').where({ id }).first();
    if (!group) {
      return res.status(404).json({
        error: true,
        code: 'GROUP_NOT_FOUND',
        message: 'Group not found'
      });
    }

    // Check if current user is a member
    const membership = await db('group_members')
      .where({ group_id: id, user_id: req.user.id })
      .first();

    if (!membership) {
      return res.status(403).json({
        error: true,
        code: 'FORBIDDEN',
        message: 'You are not a member of this group'
      });
    }

    const members = await db('group_members')
      .join('users', 'group_members.user_id', 'users.id')
      .where('group_members.group_id', id)
      .select(
        'users.id as user_id',
        'users.name',
        'users.email',
        'users.is_guest',
        'group_members.joined_at',
        'group_members.left_at'
      );

    res.json({
      ...group,
      members
    });
  } catch (err) {
    next(err);
  }
});

// POST /groups/:id/members
router.post(
  '/:id/members',
  [
    body('user_id').matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/).withMessage('User ID must be a valid UUID'),
    body('joined_at').isDate().withMessage('joined_at must be a valid YYYY-MM-DD date')
  ],
  validate,
  async (req, res, next) => {
    const { id } = req.params;
    const { user_id, joined_at } = req.body;

    try {
      // Check if group exists and requester is a member
      const groupExists = await db('group_members')
        .where({ group_id: id, user_id: req.user.id })
        .first();

      if (!groupExists) {
        return res.status(403).json({
          error: true,
          code: 'FORBIDDEN',
          message: 'You cannot add members to this group'
        });
      }

      // Check if user already a member
      const existingMember = await db('group_members')
        .where({ group_id: id, user_id })
        .first();

      if (existingMember) {
        return res.status(400).json({
          error: true,
          code: 'MEMBER_EXISTS',
          message: 'User is already a member of this group'
        });
      }

      const [newMembership] = await db('group_members')
        .insert({
          group_id: id,
          user_id,
          joined_at
        })
        .returning('*');

      res.status(201).json(newMembership);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /groups/:id/members/:uid (e.g. mark as left)
router.put(
  '/:id/members/:uid',
  [
    body('left_at').isDate().withMessage('left_at must be a valid YYYY-MM-DD date')
  ],
  validate,
  async (req, res, next) => {
    const { id, uid } = req.params;
    const { left_at } = req.body;

    try {
      // Check permissions
      const requesterMembership = await db('group_members')
        .where({ group_id: id, user_id: req.user.id })
        .first();

      if (!requesterMembership) {
        return res.status(403).json({
          error: true,
          code: 'FORBIDDEN',
          message: 'You are not authorized to update members in this group'
        });
      }

      const membership = await db('group_members')
        .where({ group_id: id, user_id: uid })
        .first();

      if (!membership) {
        return res.status(404).json({
          error: true,
          code: 'MEMBER_NOT_FOUND',
          message: 'Member not found in this group'
        });
      }

      // Ensure left_at is after joined_at
      if (new Date(left_at) < new Date(membership.joined_at)) {
        return res.status(400).json({
          error: true,
          code: 'INVALID_LEAVE_DATE',
          message: 'Leave date cannot be before join date'
        });
      }

      const [updatedMembership] = await db('group_members')
        .where({ group_id: id, user_id: uid })
        .update({ left_at })
        .returning('*');

      res.json(updatedMembership);
    } catch (err) {
      next(err);
    }
  }
);

// POST /groups/:id/members/email (User friendly add member)
router.post(
  '/:id/members/email',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Must be a valid email'),
    body('joined_at').isDate().withMessage('joined_at must be a valid date')
  ],
  validate,
  async (req, res, next) => {
    const { id } = req.params;
    const { name, email, joined_at } = req.body;

    try {
      // Check group membership of requester
      const requesterMembership = await db('group_members')
        .where({ group_id: id, user_id: req.user.id })
        .first();

      if (!requesterMembership) {
        return res.status(403).json({
          error: true,
          code: 'FORBIDDEN',
          message: 'You are not authorized to add members to this group'
        });
      }

      // Start transaction
      const membership = await db.transaction(async (trx) => {
        // Find or create user
        let user = await trx('users').where({ email: email.toLowerCase() }).first();
        if (!user) {
          const [newUser] = await trx('users')
            .insert({
              name,
              email: email.toLowerCase(),
              password_hash: 'no_login_yet' // will set up password on first register/login if they want
            })
            .returning('*');
          user = newUser;
        }

        // Check if already a member
        const existing = await trx('group_members')
          .where({ group_id: id, user_id: user.id })
          .first();

        if (existing) {
          throw new Error('User is already a member of this group');
        }

        const [newMember] = await trx('group_members')
          .insert({
            group_id: id,
            user_id: user.id,
            joined_at
          })
          .returning('*');

        return {
          ...newMember,
          name: user.name,
          email: user.email,
          is_guest: user.is_guest
        };
      });

      res.status(201).json(membership);
    } catch (err) {
      if (err.message === 'User is already a member of this group') {
        return res.status(400).json({
          error: true,
          code: 'MEMBER_EXISTS',
          message: err.message
        });
      }
      next(err);
    }
  }
);

module.exports = router;
