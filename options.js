document.addEventListener('DOMContentLoaded', function() {
    // テキストエリアにフォーカスを当てる
    const configTextarea = document.getElementById('aws-config');
    
    // 設定とプロファイル色を読み込む
    loadConfigAndColors();
    
    // Saveボタンがクリックされたときの処理
    document.getElementById('save-button').addEventListener('click', function() {
        saveConfig();
    });
    
    // 色設定保存ボタンがクリックされたときの処理
    document.getElementById('save-colors-button').addEventListener('click', function() {
        saveProfileColors();
    });
    
    // Ctrl+S または Cmd+S でも保存できるようにする
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveConfig();
        }
    });
    
    // 設定とプロファイル色を読み込む
    function loadConfigAndColors() {
        chrome.storage.sync.get(['config', 'profileColors'], function(result) {
            // AWS設定を読み込む
            if (result.config) {
                configTextarea.value = result.config;
                
                // プロファイルリストを生成
                const profiles = extractProfiles(result.config);
                
                // プロファイル色設定を読み込む
                const profileColors = result.profileColors || {};
                
                // プロファイル色設定UIを更新
                updateProfileColorUI(profiles, profileColors);
            }
            
            // 値を読み込んだ後にフォーカスを設定
            setTimeout(() => configTextarea.focus(), 100);
        });
    }
    
    // AWS設定保存処理
    function saveConfig() {
        const awsConfig = configTextarea.value;
        const saveButton = document.getElementById('save-button');
        
        // 保存中の表示
        const originalText = saveButton.textContent;
        saveButton.textContent = 'Saving...';
        saveButton.disabled = true;
        
        chrome.storage.sync.set({config: awsConfig}, function() {
            // 保存成功の表示
            saveButton.textContent = 'Saved!';
            
            // プロファイルリストを更新
            const profiles = extractProfiles(awsConfig);
            
            // 現在の色設定を読み込む
            chrome.storage.sync.get(['profileColors'], function(result) {
                const profileColors = result.profileColors || {};
                
                // プロファイル色設定UIを更新
                updateProfileColorUI(profiles, profileColors);
            });
            
            // 元のテキストに戻す
            setTimeout(() => {
                saveButton.textContent = originalText;
                saveButton.disabled = false;
            }, 1500);
        });
    }
    
    // プロファイル色設定保存処理
    function saveProfileColors() {
        const profileList = document.getElementById('profile-list');
        const saveButton = document.getElementById('save-colors-button');
        const profileColors = {};
        
        // 各プロファイルの色設定を取得
        const profileItems = profileList.querySelectorAll('.profile-item');
        profileItems.forEach(item => {
            const profileName = item.querySelector('.profile-name').dataset.profile;
            const selectedColor = item.querySelector('input[name="color-' + profileName + '"]:checked');
            if (selectedColor) {
                profileColors[profileName] = selectedColor.value;
            }
        });
        
        // 保存中の表示
        const originalText = saveButton.textContent;
        saveButton.textContent = 'Saving...';
        saveButton.disabled = true;
        
        // 色設定を保存
        chrome.storage.sync.set({profileColors: profileColors}, function() {
            // 保存成功の表示
            saveButton.textContent = 'Saved!';
            
            // 元のテキストに戻す
            setTimeout(() => {
                saveButton.textContent = originalText;
                saveButton.disabled = false;
            }, 1500);
        });
    }
    
    // AWS設定からプロファイルを抽出
    function extractProfiles(configText) {
        const profileRegex = /\[profile (.+?)\]/g;
        let match;
        const profiles = [];
        
        while ((match = profileRegex.exec(configText)) !== null) {
            const profileName = match[1].trim();
            
            // プロファイル内容を解析して、role_arnまたはaws_account_idとrole_nameがあるかチェック
            const profileStartIndex = match.index + match[0].length;
            let profileEndIndex = configText.indexOf('[profile ', profileStartIndex);
            if (profileEndIndex === -1) {
                profileEndIndex = configText.length;
            }
            
            const profileContent = configText.substring(profileStartIndex, profileEndIndex);
            
            // role_arnまたはaws_account_idとrole_nameがあるプロファイルのみを追加
            if (profileName.toLowerCase() !== 'default' && 
                (profileContent.includes('role_arn') || 
                 (profileContent.includes('aws_account_id') && profileContent.includes('role_name')))) {
                profiles.push(profileName);
            }
        }
        
        return profiles;
    }
    
    // 利用可能な色の定義
    const availableColors = [
        { name: '赤（Red）', value: '#f2b0a9' },
        { name: '青（Blue）', value: '#83d4e8' },
        { name: '緑（Green）', value: '#b7ca9d' },
        { name: '黄（Yellow）', value: '#efda95' },
        { name: 'オレンジ（Orange）', value: '#fbc8aa' }
    ];
    
    // プロファイル色設定UIを更新
    function updateProfileColorUI(profiles, profileColors) {
        const profileList = document.getElementById('profile-list');
        
        // プロファイルリストをクリア
        profileList.innerHTML = '';
        
        // プロファイルがない場合
        if (profiles.length === 0) {
            profileList.innerHTML = `
                <div class="no-profiles">
                    <p>有効なAWSロールプロファイルが見つかりません。</p>
                    <p>AWS設定に有効なrole_arnエントリが含まれていることを確認してください。</p>
                </div>
            `;
            return;
        }
        
        // プロファイルごとに色設定UIを生成
        profiles.forEach(profileName => {
            const profileItem = document.createElement('div');
            profileItem.className = 'profile-item';
            
            // プロファイル名
            const profileNameElem = document.createElement('div');
            profileNameElem.className = 'profile-name';
            profileNameElem.textContent = profileName;
            profileNameElem.dataset.profile = profileName;
            
            // 色選択コンテナ
            const colorPickerContainer = document.createElement('div');
            colorPickerContainer.className = 'color-picker-container';
            
            // 現在設定されている色
            const currentColor = profileColors[profileName] || getRandomColor();
            
            // 色選択ラジオボタンを生成
            availableColors.forEach(color => {
                const colorOption = document.createElement('div');
                colorOption.className = 'color-option';
                
                const radioInput = document.createElement('input');
                radioInput.type = 'radio';
                radioInput.name = 'color-' + profileName;
                radioInput.value = color.value;
                radioInput.id = 'color-' + profileName + '-' + color.value.replace('#', '');
                radioInput.checked = currentColor === color.value;
                
                const radioLabel = document.createElement('label');
                radioLabel.htmlFor = radioInput.id;
                radioLabel.style.backgroundColor = color.value;
                radioLabel.title = color.name;
                
                colorOption.appendChild(radioInput);
                colorOption.appendChild(radioLabel);
                
                colorPickerContainer.appendChild(colorOption);
            });
            
            // 要素を追加
            profileItem.appendChild(profileNameElem);
            profileItem.appendChild(colorPickerContainer);
            
            profileList.appendChild(profileItem);
        });
    }
    
    // 利用可能な色からランダムに選択
    function getRandomColor() {
        const randomIndex = Math.floor(Math.random() * availableColors.length);
        return availableColors[randomIndex].value;
    }
});
