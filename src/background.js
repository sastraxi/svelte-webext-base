import firebase from 'firebase/app';// rollup bundle issue with ESM import
import 'firebase/auth';
import 'firebase/firestore';
const firebaseConfig = {
	apiKey: "AIzaSyAcb2rpzwqExSSfVQz7swjYeOMj6TNBcRI",
	authDomain: "link-share-c2421.firebaseapp.com",
	databaseURL: "https://link-share-c2421.firebaseio.com",
	projectId: "link-share-c2421",
	storageBucket: "link-share-c2421.appspot.com",
	messagingSenderId: "522831258338",
	appId: "1:522831258338:web:4c0087991545da39"
  };

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();

const db = firebase.firestore();

const snapshotListenerUnsubscribe = null;

function setupQuery(user) {
	snapshotListenerUnsubscribe = db.collection('links').where('uid', '==', user.uid).where('fresh', '==', true).onSnapshot((snapshot) => {
		// collect updates in batch
		const batch = db.batch();
		snapshot.docChanges().forEach((change) => {
			if (change.type === "added") {
				const website = change.doc.data();
				console.log("New link: ", website);
				browser.tabs.create({ url: website.url, active: true });
				batch.update(change.doc.ref, { "fresh": false });
			}
		});
		// execute updates at once
		batch.commit();
	});
}

// USER STATE MESSENGER
firebase.auth().onAuthStateChanged(function(user) {
	if (user) {
		browser.runtime.sendMessage({
			action: 'user',
			user: { email: user.email }
		});
		setupQuery(user);
	} else {
		browser.runtime.sendMessage({
			action: 'user',
			user: null
		});
		tearDown();
	}
});

// CLEAN EXIT
function tearDown() {
	snapshotListenerUnsubscribe && snapshotListenerUnsubscribe();
}

// ACTION HANDLER
browser.runtime.onMessage.addListener((message) => {
	console.log('background got message:', message)
	switch(message.action) {
	case 'user':
		const { email } = auth.currentUser;
		return new Promise(resolve => {
			  resolve({ email });
		  });
	case 'login':
		console.log('doing login...')
		auth.signInWithEmailAndPassword(message.email, message.password);
		break;
	case 'logout':
		console.log('doing logout...')
		tearDown();
		auth.signOut();
		break;
	case 'signup':
		auth.createUserWithEmailAndPassword(message.email, message.password);
		break;
	default:
		console.warn('Action not implemented in background!')
	}
});

// CLEANUP
window.addEventListener("unload", tearDown);