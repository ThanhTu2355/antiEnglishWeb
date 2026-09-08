const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  folder_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    required: true,
    index: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  word: {
    type: String,
    required: true,
    trim: true
  },
  phonetic: {
    type: String,
    default: ''
  },
  meaning: {
    type: String,
    required: true,
    trim: true
  },
  part_of_speech: {
    type: String,
    default: 'noun'
  },
  example_en: {
    type: String,
    default: ''
  },
  example_vi: {
    type: String,
    default: ''
  },
  note: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['new', 'learning', 'mastered'],
    default: 'new',
    index: true
  },
  level: {
    type: String,
    enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    default: 'B1',
    index: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

cardSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret.__v;
    return ret;
  }
});

cardSchema.set('toObject', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Card', cardSchema);
