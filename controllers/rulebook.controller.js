import Rulebook from '../models/Rulebook.js';

export const uploadRulebook = async (req, res) => {
  try {
    const { title, content, version } = req.body;
    const rulebook = new Rulebook({
      title,
      content,
      version,
      uploadedBy: req.user._id || req.user.id
    });
    await rulebook.save();
    res.status(201).json({ success: true, data: rulebook });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRulebooks = async (req, res) => {
  try {
    const rulebooks = await Rulebook.find().sort({ createdAt: -1 });
    res.json({ success: true, data: rulebooks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const publishRulebook = async (req, res) => {
  try {
    // Unpublish all other rulebooks
    await Rulebook.updateMany({}, { status: 'DRAFT' });
    
    const rulebook = await Rulebook.findById(req.params.id);
    if (!rulebook) return res.status(404).json({ success: false, message: 'Rulebook not found' });

    rulebook.status = 'PUBLISHED';
    rulebook.publishedAt = new Date();
    await rulebook.save();

    res.json({ success: true, data: rulebook });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCurrentRulebook = async (req, res) => {
  try {
    const rulebook = await Rulebook.findOne({ status: 'PUBLISHED' }).sort({ publishedAt: -1 });
    res.json({ success: true, data: rulebook });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
