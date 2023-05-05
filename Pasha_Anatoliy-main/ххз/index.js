const express = require("express"); // сервер
const mongoose = require("mongoose"); // для конекту з базою
const multer = require("multer"); // для збереження фото
const uuidv4 = require("uuid").v4; // для генерації випадкових ід
const fs = require("fs"); // для роботи з файлами
const path = require("path"); // для роботи з шляхами

const app = express();

const IMAGE_DIR = "./image_uploads/images/";
if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR);
}
mongoose
  .connect(
    "mongodb+srv://anbilunyk:PTlFOCAjOCyPlMEr@cluster0.mlqt9za.mongodb.net/image_storage",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

const imageSchema = new mongoose.Schema({
  url: String,
});

const Image = mongoose.model("Image", imageSchema);

// Налаштовуємо multer для завантаження файлів
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, IMAGE_DIR);
  },
  filename: function (req, file, cb) {
    const ext = file.originalname.split(".").pop();
    const filename = `${uuidv4()}.${ext}`;
    cb(null, filename);
  },
});
const upload = multer({ storage: storage });

// Обробник завантаження зображення
app.post("/upload", upload.single("image"), async (req, res) => {
  const image_url = `/images/${req.file.filename}`;

  // Зберігаємо посилання на зображення в базу даних
  try {
    await Image.create({ url: image_url });
    res.status(201).send("Image uploaded successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Unable to save image to database");
  }
});

// Видалення зображення
app.delete("/image/:id", async (req, res) => {
  const image_id = req.params.id;

  try {
    const image = await Image.findById(image_id);
    const image_url = image.url;

    if (!image) {
      res.status(404).send("Image not found");
    }

    const { dir, base } = path.parse(image_url);
    const image_path = path.join(IMAGE_DIR, base);

    if (fs.existsSync(image_path)) {
      fs.unlinkSync(image_path);
    }

    // Видалення зображення з бази
    await Image.findByIdAndDelete(image_id);

    res.status(200).send("Image deleted successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Unable to delete image");
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Image storage service is listening on port ${PORT}`);
});