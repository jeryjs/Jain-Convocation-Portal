// Deprecated: OneDrive service is no longer in use
// The onedrive endpoint no longer works either - MS killed it



// const axios = require("axios");
// const { getSettings } = require("../config/settings");
// const { cache, TTL } = require("../config/cache");

// const getShareId = () => {
// 	const settings = getSettings();
// 	return settings.courses?.folderId || process.env.ONEDRIVE_SHAREID;
// };

// const getCourseFolders = async () => {
//   const cacheKey = "course_folders";
//   const cached = await cache.get(cacheKey);
//   if (cached) {
// 	console.log("📦 Serving cached sessions");
// 	return cached;
// 	}

//   const shareId = getShareId();
//   const getFolders = async (path = '') => {
//     const response = await axios.get(
//       `https://api.onedrive.com/v1.0/shares/s!${shareId}/root${path}/children?$filter=folder ne null`
//     );
//     return response.data.value.filter(item => item.folder);
//   };

//   const days = await getFolders();
//   const structure = await Promise.all(days.map(async day => ({
//     name: day.name,
//     times: await Promise.all((await getFolders(`:/${day.name}:`)).map(async time => ({
//       name: time.name,
//       batches: (await getFolders(`:/${day.name}/${time.name}:`)).map(batch => batch.name)
//     })))
//   })));

//   await cache.set(cacheKey, structure, TTL.COURSES);
//   return structure;
// };

// const getCourseImages = async (day, time, batch) => {
// 	const cacheKey = `course_images_${day}_${time}_${batch}`;
// 	const cachedImages = await cache.get(cacheKey);

// 	if (cachedImages) {
// 		console.log("📦 Serving cached images");
// 		return cachedImages;
// 	}

// 	const shareId = getShareId();
// 	const path = `${day}/${time}/${batch}`;
// 	const response = await axios.get(`https://api.onedrive.com/v1.0/shares/s!${shareId}/root:/${path}?expand=children(expand=thumbnails)`);

// 	const images = response.data.children
// 		.filter((item) => item.image)
// 		.map((item) => ({
// 			[`${path}/${item.name}`]: item.thumbnails[0].large.url.replace(/width=\d+&height=\d+/, "width=480&height=480"),
// 		}));

// 	await cache.set(cacheKey, images, TTL.COURSES);
// 	return images;
// };

// // Updated to handle full paths directly
// const getImageLinks = async (fullPaths) => {
// 	const cacheKey = `image_links_${fullPaths.join(",")}`;
// 	const cachedLinks = await cache.get(cacheKey);

// 	if (cachedLinks) {
// 		console.log("📦 Serving cached Links");
// 		return cachedLinks;
// 	}

// 	const shareId = getShareId();
// 	try {
// 		const links = await Promise.all(
// 			fullPaths.map(async (path) => {
// 				const response = await axios.get(`https://api.onedrive.com/v1.0/shares/s!${shareId}/root:/${path}`);
// 				return {
// 					name: path,
// 					url: response.data["@content.downloadUrl"],
// 				};
// 			})
// 		);

// 		await cache.set(cacheKey, links, TTL.COURSES);
// 		return links;
// 	} catch (error) {
// 		console.error("Error getting image links:", error);
// 		throw error;
// 	}
// };

// module.exports = { getCourseFolders, getCourseImages, getImageLinks };
