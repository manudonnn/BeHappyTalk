const fs = require('fs');

try {
  let c = fs.readFileSync('app/home.tsx', 'utf-8');
  
  // Replace the mock arrays with import
  c = c.replace(/const RECENT_CONTACTS = \[[\s\S]*?const RECOMMENDED = \[[\s\S]*?\];/m, "import { RECENT_CONTACTS, PROVIDERS, INBOX_ITEMS, RECOMMENDED } from '../assets/data/mock';");
  
  // Make Talk Now buttons routable
  c = c.replace(/<TouchableOpacity style=\{styles\.talkButton\}>/g, "<TouchableOpacity style={styles.talkButton} onPress={() => router.push(`/chat/${item.id}`)}>");
  c = c.replace(/<TouchableOpacity style=\{styles\.recTalkBtn\}>/g, "<TouchableOpacity style={styles.recTalkBtn} onPress={() => { setShowRecommendedModal(false); router.push(`/chat/${rec.id}`); }}>");
  
  // Convert recent items to TouchableOpacity
  c = c.replace(/<View style=\{styles\.recentItem\}(\s*key=\{item\.id\})?>/g, "<TouchableOpacity style={styles.recentItem} key={item.id} onPress={() => router.push(`/chat/${item.id}`)}>");
  c = c.replace(/<\/View>(\s*)<Text style=\{styles\.recentName\}/g, "</TouchableOpacity>$1<Text style={styles.recentName}");

  // Convert Inbox items to TouchableOpacity
  c = c.replace(/<View style=\{styles\.inboxItem\}(\s*key=\{item\.id\})?>/g, "<TouchableOpacity style={styles.inboxItem} key={item.id} onPress={() => router.push(`/chat/${item.id}`)}>");
  c = c.replace(/<\/Text>\s*<\/View>\s*<\/View>\s*<\/View>\s*<\/View>/g, "</Text>\n            </View>\n          </View>\n        </View>\n      </TouchableOpacity>");
  
  // For the anonymous modal Talk button
  c = c.replace(/<TouchableOpacity style=\{styles\.modalButton\}>/g, "<TouchableOpacity style={styles.modalButton} onPress={() => { setShowAnonModal(false); router.push(`/chat/p3`); }}>");

  fs.writeFileSync('app/home.tsx', c);
  console.log('Home.tsx updated successfully');
} catch (e) {
  console.error(e);
}
