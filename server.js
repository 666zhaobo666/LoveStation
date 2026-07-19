const express = require('express');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || '5201314';
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'lovestation-glassmorphic-secret-pass-key-5201314';

// Ensure data and uploads directories exist
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Default DB fallback if not exists
const DB_PATH = path.join(DATA_DIR, 'database.json');
const DEFAULT_DB = {
  anniversaries: [
    {
      id: "ann-1",
      title: "我们第一次相遇",
      date: "2024-02-14",
      type: "one-time",
      tags: ["遇见", "回忆"],
      image: "",
      description: "那天阳光正好，在咖啡馆的角落里，命运让我们相遇。第一眼看到你，就觉得世界突然亮了起来。"
    },
    {
      id: "ann-2",
      title: "在一起的第一天",
      date: "2024-05-20",
      type: "yearly",
      tags: ["恋爱", "纪念日"],
      image: "",
      description: "520，在这个充满爱意的日子里，你答应了我的表白。那一刻的激动与喜悦，至今记忆犹新。我们要一直走下去！"
    },
    {
      id: "ann-3",
      title: "第一次一起旅行",
      date: "2024-10-01",
      type: "one-time",
      tags: ["旅行", "生活"],
      image: "",
      description: "国庆假期，我们一起去了海边。吹着海风，看着晚霞，牵着手在沙滩上漫步。那是我们最浪漫的慢时光。"
    },
    {
      id: "ann-4",
      title: "宝贝的生日 🎂",
      date: "1999-10-15",
      type: "yearly",
      tags: ["生日", "生活"],
      image: "",
      description: "祝我的大宝贝生日快乐！新的一岁，愿你被这个世界温柔以待，每天都有甜甜的笑容。有你在的每一天都是甜的！"
    }
  ],
  settings: {
    togetherSince: "2024-05-20",
    title: "我们的爱之小站"
  }
};

if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
}

// Database helper functions
function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return DEFAULT_DB;
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return DEFAULT_DB;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing database:', error);
    return false;
  }
}

// Multer storage configuration for anniversary images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`;
    cb(null, filename);
  }
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpg, jpeg, png, gif, webp) are allowed!'));
  }
});

// Multer storage configuration for ZIP backup file
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DATA_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, 'temp_backup.zip');
  }
});
const uploadBackup = multer({ storage: tempStorage });

// Express Middlewares
app.use(express.json());
app.use(cookieParser(COOKIE_SECRET));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Helper middleware to check Admin auth status
function requireAdmin(req, res, next) {
  if (req.signedCookies.admin === 'true') {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized. Admin permissions required.' });
}

// ================= API ENDPOINTS =================

// 1. Auth Status & Login/Logout
app.get('/api/status', (req, res) => {
  const isAdmin = req.signedCookies.admin === 'true';
  res.json({ isAdmin });
});

app.post('/api/login', (req, res) => {
  const { passcode } = req.body;
  const db = readDB();
  const currentPasscode = (db.settings && db.settings.adminPasscode) || ADMIN_PASSCODE;
  if (passcode === currentPasscode) {
    // Set cookie valid for 30 days
    res.cookie('admin', 'true', {
      signed: true,
      httpOnly: true,
      secure: false, // Set to true if using HTTPS
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    return res.json({ success: true, message: 'Welcome back, Admin!' });
  }
  return res.status(401).json({ error: 'Incorrect passcode!' });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('admin');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// 2. Fetch Anniversaries & Settings (Public)
app.get('/api/anniversaries', (req, res) => {
  const db = readDB();
  // Deep-clone db object to avoid mutating internal memory cache if applicable
  const sanitizedDB = JSON.parse(JSON.stringify(db));
  if (sanitizedDB.settings && sanitizedDB.settings.adminPasscode) {
    delete sanitizedDB.settings.adminPasscode;
  }
  res.json(sanitizedDB);
});

// Helper to delete physical files from uploads directory if they are no longer referenced in the database
function deletePhysicalFiles(filesToDelete, db) {
  if (!Array.isArray(filesToDelete)) return;
  
  filesToDelete.forEach(filePath => {
    if (!filePath || !filePath.startsWith('/uploads/')) return;
    
    // Check if this file is still used by ANY anniversary in the database
    const isStillUsed = db.anniversaries.some(ann => {
      const annImages = Array.isArray(ann.images) ? ann.images : (ann.image ? [ann.image] : []);
      return annImages.includes(filePath);
    });
    
    if (!isStillUsed) {
      const filename = filePath.substring('/uploads/'.length);
      const physicalPath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(physicalPath)) {
        fs.unlink(physicalPath, (err) => {
          if (err) console.error('Error deleting physical file:', err);
        });
      }
    }
  });
}

// 3. Add Anniversary (Admin)
app.post('/api/anniversaries', requireAdmin, (req, res) => {
  const { title, date, type, tags, images, image, description } = req.body;
  
  if (!title || !date) {
    return res.status(400).json({ error: 'Title and date are required.' });
  }

  const db = readDB();
  
  // Set up backward-compatible image/images support
  let finalImages = Array.isArray(images) ? images : [];
  if (finalImages.length === 0 && image) {
    finalImages.push(image);
  }

  const newAnniversary = {
    id: `ann-${Date.now()}`,
    title,
    date,
    type: type || 'one-time',
    tags: Array.isArray(tags) ? tags : [],
    image: finalImages[0] || '', // backward compatibility
    images: finalImages,
    description: description || '',
    createdAt: new Date().toISOString()
  };

  db.anniversaries.push(newAnniversary);
  
  // Sort anniversaries chronologically (oldest first)
  db.anniversaries.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (writeDB(db)) {
    res.status(201).json(newAnniversary);
  } else {
    res.status(500).json({ error: 'Failed to write to database.' });
  }
});

// 4. Update Anniversary (Admin)
app.put('/api/anniversaries/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { title, date, type, tags, images, image, description } = req.body;

  if (!title || !date) {
    return res.status(400).json({ error: 'Title and date are required.' });
  }

  const db = readDB();
  const index = db.anniversaries.findIndex(item => item.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Anniversary not found.' });
  }

  const oldImages = db.anniversaries[index].images || (db.anniversaries[index].image ? [db.anniversaries[index].image] : []);

  let finalImages = oldImages;
  if (images !== undefined) {
    finalImages = Array.isArray(images) ? images : [];
  } else if (image !== undefined) {
    finalImages = image ? [image] : [];
  }

  db.anniversaries[index] = {
    ...db.anniversaries[index],
    title,
    date,
    type: type || 'one-time',
    tags: Array.isArray(tags) ? tags : [],
    image: finalImages[0] || '', // backward compatibility
    images: finalImages,
    description: description || '',
    updatedAt: new Date().toISOString()
  };

  // Find physical files that were in oldImages but are no longer in finalImages, and garbage collect them
  const filesToDelete = oldImages.filter(file => !finalImages.includes(file));
  deletePhysicalFiles(filesToDelete, db);

  // Resort after date changes
  db.anniversaries.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (writeDB(db)) {
    res.json(db.anniversaries[index]);
  } else {
    res.status(500).json({ error: 'Failed to write to database.' });
  }
});

// 5. Delete Anniversary (Admin)
app.delete('/api/anniversaries/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.anniversaries.findIndex(item => item.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Anniversary not found.' });
  }

  const oldImages = db.anniversaries[index].images || (db.anniversaries[index].image ? [db.anniversaries[index].image] : []);
  db.anniversaries.splice(index, 1);

  if (writeDB(db)) {
    // Delete physical files that are no longer referenced anywhere else
    deletePhysicalFiles(oldImages, db);
    res.json({ success: true, message: 'Anniversary deleted.' });
  } else {
    res.status(500).json({ error: 'Failed to write to database.' });
  }
});

// 6. Update Settings (Admin)
app.put('/api/settings', requireAdmin, (req, res) => {
  const { togetherSince, title, adminPasscode, favicon } = req.body;
  
  if (!togetherSince || !title) {
    return res.status(400).json({ error: 'Together Since date and Station Title are required.' });
  }

  const db = readDB();
  if (!db.settings) {
    db.settings = {};
  }

  db.settings.togetherSince = togetherSince;
  db.settings.title = title;

  if (adminPasscode && adminPasscode.trim()) {
    db.settings.adminPasscode = adminPasscode.trim();
  }

  if (favicon !== undefined) {
    db.settings.favicon = favicon;
  }

  if (writeDB(db)) {
    const clientSettings = { ...db.settings };
    delete clientSettings.adminPasscode; // hide passcode in client response
    res.json(clientSettings);
  } else {
    res.status(500).json({ error: 'Failed to write settings to database.' });
  }
});

// 7. Upload Image (Admin)
app.post('/api/upload', requireAdmin, uploadImage.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded.' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// 8. One-Click Backup Export (Admin)
app.get('/api/export', requireAdmin, (req, res) => {
  try {
    const zip = new AdmZip();
    
    // Add database.json to ZIP
    if (fs.existsSync(DB_PATH)) {
      zip.addLocalFile(DB_PATH, ''); // Root level in ZIP
    }
    
    // Add uploaded files to ZIP (under uploads folder)
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = fs.readdirSync(UPLOADS_DIR);
      files.forEach(file => {
        const filePath = path.join(UPLOADS_DIR, file);
        if (fs.statSync(filePath).isFile()) {
          zip.addLocalFile(filePath, 'uploads'); // Puts files in 'uploads/' directory in ZIP
        }
      });
    }

    const downloadName = `lovestation-backup-${Date.now()}.zip`;
    const zipBuffer = zip.toBuffer();

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${downloadName}`);
    res.send(zipBuffer);
  } catch (error) {
    console.error('Export failed:', error);
    res.status(500).json({ error: 'Export failed.' });
  }
});

// 9. One-Click Backup Import (Admin)
app.post('/api/import', requireAdmin, uploadBackup.single('backup'), (req, res) => {
  const tempZipPath = path.join(DATA_DIR, 'temp_backup.zip');
  
  try {
    if (!req.file || !fs.existsSync(tempZipPath)) {
      return res.status(400).json({ error: 'No backup file uploaded.' });
    }

    const zip = new AdmZip(tempZipPath);
    const zipEntries = zip.getEntries();
    
    // Validate ZIP content: must contain database.json
    const hasDatabase = zipEntries.some(entry => entry.entryName === 'database.json');
    if (!hasDatabase) {
      fs.unlinkSync(tempZipPath); // Cleanup
      return res.status(400).json({ error: 'Invalid backup file. database.json not found in ZIP root.' });
    }

    // Clean up current uploads folder and database to prevent orphaned/duplicate items
    if (fs.existsSync(UPLOADS_DIR)) {
      const existingFiles = fs.readdirSync(UPLOADS_DIR);
      existingFiles.forEach(file => {
        fs.unlinkSync(path.join(UPLOADS_DIR, file));
      });
    } else {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    // Extract database.json directly to data directory
    zip.extractEntryTo('database.json', DATA_DIR, false, true);

    // Extract uploads folder contents to data/uploads
    zipEntries.forEach(entry => {
      if (entry.entryName.startsWith('uploads/') && !entry.isDirectory) {
        zip.extractEntryTo(entry.entryName, DATA_DIR, true, true);
      }
    });

    // Cleanup temp ZIP
    fs.unlinkSync(tempZipPath);

    res.json({ success: true, message: 'Backup restored successfully!' });
  } catch (error) {
    console.error('Import failed:', error);
    if (fs.existsSync(tempZipPath)) {
      fs.unlinkSync(tempZipPath);
    }
    res.status(500).json({ error: 'Import and restoration failed.' });
  }
});

// Error handling for Multer or general server issues
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`❤️  LoveStation is running on http://localhost:${PORT}`);
  console.log(`🔑 Admin Passcode: ${ADMIN_PASSCODE}`);
  console.log(`====================================================`);
});
