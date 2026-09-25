import Announcement from '../models/Announcement.js';

export const createAnnouncement = async (req, res) => {
  try {
    const { title, content, category, importance } = req.body;
    const announcement = new Announcement({
      title,
      content,
      category,
      importance,
      createdBy: req.user._id || req.user.id
    });
    await announcement.save();
    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAnnouncements = async (req, res) => {
  try {
    // If not admin, only get PUBLISHED announcements
    let filter = {};
    if (!req.user || req.user.role !== 'ADMIN') {
      filter = { status: 'PUBLISHED' };
    }
    const announcements = await Announcement.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: announcements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const publishAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });

    announcement.status = 'PUBLISHED';
    announcement.publishedAt = new Date();
    await announcement.save();

    // Here we can trigger email sending to all approved teams
    
    res.json({ success: true, data: announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
