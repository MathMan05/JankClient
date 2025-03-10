//This is *only* for webkit, and it really sucks
//If webkit starts supporting the more sain way, let me know so I can remove this after a year or two of them supporting it
onmessage = async (e) => {
	const [file, content, rand] = e.data as [FileSystemFileHandle, ArrayBuffer, number];
	try {
		const handle = await file.createSyncAccessHandle();
		handle.write(content);
		handle.close();
		postMessage([rand, true]);
	} catch {
		postMessage([rand, false]);
	}
};
