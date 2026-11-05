import Rulebook from '../models/Rulebook.js';

export const uploadRulebook = async (req, res) => {
  try {
    const { title, content, version, status } = req.body;
    const rulebook = new Rulebook({
      title,
      content,
      version,
      status: status || 'DRAFT',
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
    const rulebooks = await Rulebook.find();
    // Sort numerically by version if numeric, else by createdAt
    rulebooks.sort((a, b) => {
      const numA = parseFloat(a.version);
      const numB = parseFloat(b.version);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    res.json({ success: true, data: rulebooks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const publishRulebook = async (req, res) => {
  try {
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

export const unpublishRulebook = async (req, res) => {
  try {
    const rulebook = await Rulebook.findById(req.params.id);
    if (!rulebook) return res.status(404).json({ success: false, message: 'Rulebook not found' });

    rulebook.status = 'DRAFT';
    await rulebook.save();

    res.json({ success: true, data: rulebook });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCurrentRulebook = async (req, res) => {
  try {
    const published = await Rulebook.find({ status: 'PUBLISHED' });
    
    if (published.length > 1) {
      published.sort((a, b) => {
        const numA = parseFloat(a.version);
        const numB = parseFloat(b.version);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return new Date(a.createdAt) - new Date(b.createdAt);
      });

      const combinedContent = published
        .map(r => `### ${r.title}\n*Protocol Version ${r.version}*\n\n${r.content}`)
        .join('\n\n---\n\n');

      return res.json({
        success: true,
        data: {
          title: 'BATTLEGROUNDS OFFICIAL TOURNAMENT DIRECTIVES',
          version: `v${published[0].version} - v${published[published.length - 1].version}`,
          content: combinedContent,
          sections: published,
          isMultiSection: true
        }
      });
    }

    if (published.length === 1) {
      return res.json({ 
        success: true, 
        data: {
          ...published[0].toObject(),
          sections: [published[0]],
          isMultiSection: false
        }
      });
    }

    // Fallback if none currently marked PUBLISHED
    const fallback = await Rulebook.findOne().sort({ createdAt: -1 });
    res.json({ success: true, data: fallback });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateRulebook = async (req, res) => {
  try {
    const { title, content, version, status } = req.body;
    const rulebook = await Rulebook.findById(req.params.id);
    if (!rulebook) return res.status(404).json({ success: false, message: 'Rulebook not found' });

    rulebook.title = title || rulebook.title;
    rulebook.content = content || rulebook.content;
    rulebook.version = version || rulebook.version;
    if (status) rulebook.status = status;
    await rulebook.save();

    res.json({ success: true, data: rulebook });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteRulebook = async (req, res) => {
  try {
    const rulebook = await Rulebook.findById(req.params.id);
    if (!rulebook) return res.status(404).json({ success: false, message: 'Rulebook not found' });

    await rulebook.deleteOne();
    res.json({ success: true, message: 'Rulebook deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
