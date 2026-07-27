import 'dotenv/config';
const token = process.env.META_TOKEN;
const AD_ID = '120249874343940744'; // Housewives – Back to Work (2nd ad)

const res = await fetch(
  `https://graph.facebook.com/v19.0/${AD_ID}?` +
  `fields=name,adset_id,creative{id,name,object_story_spec,image_hash,image_url,title,body}` +
  `&access_token=${token}`
);
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
