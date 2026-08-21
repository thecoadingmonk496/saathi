const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Admin (Public for now)
async function getAllUsers(req, res) {
  try {
    // Exclude password from the query for security
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ success: false, message: 'Server error while fetching users' });
  }
}

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Admin (Public for now)
async function deleteUser(req, res) {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error.message);
    res.status(500).json({ success: false, message: 'Server error while deleting user' });
  }
}

module.exports = {
  getAllUsers,
  deleteUser,
};
