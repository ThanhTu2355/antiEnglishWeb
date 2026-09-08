const mongoose = require('mongoose');

const practiceHistorySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  folder_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  score: {
    type: Number,
    required: true
  },
  total_questions: {
    type: Number,
    required: true
  },
  mode: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

practiceHistorySchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret.__v;
    return ret;
  }
});

practiceHistorySchema.set('toObject', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('PracticeHistory', practiceHistorySchema);
