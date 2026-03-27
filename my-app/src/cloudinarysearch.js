const cloudinary = require("./config");

async function getRandomImage(traits) {

  const query = traits.map(t => `tags=${t}`).join(" AND ");

  const result = await cloudinary.search
    .expression(query)
    .max_results(30)
    .execute();

  const images = result.resources;

  if (!images.length) return null;

  const randomImage =
    images[Math.floor(Math.random() * images.length)];

  return randomImage.secure_url;
}

module.exports = getRandomImage;