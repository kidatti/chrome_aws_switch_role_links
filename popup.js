document.addEventListener('DOMContentLoaded', function() {
    // ローディングインジケーターを表示
    showLoading();
    
    // 設定を読み込む
    loadConfig();

    // 設定ボタンのイベントリスナー
    document.getElementById('config-button').addEventListener('click', function() {
        chrome.runtime.openOptionsPage();
    });
    
    // キーボードショートカット
    document.addEventListener('keydown', function(e) {
        // 'c'キーで設定ページを開く
        if (e.key === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            chrome.runtime.openOptionsPage();
        }
    });
});

// 利用可能な色の定義（options.jsと同じ定義を使用）
const availableColors = [
    { name: '赤（Red）', value: '#f2b0a9' },
    { name: '青（Blue）', value: '#83d4e8' },
    { name: '緑（Green）', value: '#b7ca9d' },
    { name: '黄（Yellow）', value: '#efda95' },
    { name: 'オレンジ（Orange）', value: '#fbc8aa' }
];

// ローディングインジケーターを表示
function showLoading() {
    const linksContainer = document.getElementById('links');
    linksContainer.innerHTML = '<div class="loading">Loading profiles...</div>';
    
    // ローディングスタイルを追加
    const style = document.createElement('style');
    style.textContent = `
        .loading {
            text-align: center;
            padding: 20px;
            color: #202124;
            font-size: 1.2rem;
        }
    `;
    document.head.appendChild(style);
}

// 設定を読み込む
function loadConfig() {
    // configとprofileColorsの両方を読み込む
    chrome.storage.sync.get(['config', 'profileColors'], function(result) {
        if (result.config) {
            generateLinks(result.config, result.profileColors || {});
        } else {
            // 設定がない場合のメッセージ
            const linksContainer = document.getElementById('links');
            linksContainer.innerHTML = `
                <div class="no-config">
                    <p>No AWS profiles configured yet.</p>
                    <p>Click the Config button to set up your profiles.</p>
                </div>
            `;
            
            // スタイルを追加
            const style = document.createElement('style');
            style.textContent = `
                .no-config {
                    text-align: center;
                    padding: 20px;
                    color: #202124;
                    font-size: 1.2rem;
                }
                .no-config p {
                    margin: 10px 0;
                }
            `;
            document.head.appendChild(style);
        }
    });
}

function generateLinks(configText, profileColors) {
    const linksContainer = document.getElementById('links');
    linksContainer.innerHTML = '';

    const profileRegex = /\[profile (.+?)\]/g;
    let match;
    const profiles = [];
    let lastIndex = 0;

    while ((match = profileRegex.exec(configText)) !== null) {
        profiles.push(configText.substring(lastIndex, match.index).trim());
        lastIndex = match.index;
    }
    profiles.push(configText.substring(lastIndex).trim());

    const links = [];

    for (let i = 1; i < profiles.length; i++) {
        const profile = profiles[i];
        const lines = profile.split('\n');
        const profileNameMatch = lines[0].match(/\[profile (.+?)\]/);
        if (!profileNameMatch) continue;

        const profileName = profileNameMatch[1].trim();
        const profileContent = lines.slice(1).join('\n').trim();

        if (profileName.toLowerCase() === 'default' || (!profileContent.includes('role_arn') && !(profileContent.includes('aws_account_id') && profileContent.includes('role_name')))) {
            continue; // 無視するパターンをスキップ
        }

        const profileData = profileContent.split('\n').reduce((acc, line) => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim();
                acc[key] = value;
            }
            return acc;
        }, {});

        let roleName, accountId;
        
        if (profileData.role_arn) {
            const roleArnParts = profileData.role_arn.split(':');
            accountId = roleArnParts[4];
            roleName = roleArnParts[5].split('/')[1];
        } else {
            accountId = profileData.aws_account_id;
            roleName = profileData.role_name;
        }

        // 基本URLを作成
        let url = `https://signin.aws.amazon.com/switchrole?roleName=${roleName}&account=${accountId}&displayName=${profileName}`;
        
        // プロファイルに色が設定されている場合、URLに色パラメータを追加
        const profileColor = profileColors[profileName];
        if (profileColor) {
            // #を除いた色コードを使用
            const colorCode = profileColor.replace('#', '');
            url += `&color=${colorCode}`;
        }

        links.push({ 
            profileName, 
            roleName,
            accountId,
            color: profileColor,
            url: url // URLを明示的に保存
        });
    }

    // プロファイル名でソート
    links.sort((a, b) => a.profileName.localeCompare(b.profileName));

    // リンクがない場合のメッセージ
    if (links.length === 0) {
        linksContainer.innerHTML = `
            <div class="no-links">
                <p>No valid AWS role profiles found.</p>
                <p>Make sure your config file contains valid role_arn entries.</p>
            </div>
        `;
        return;
    }

    // リンク数を表示
    const countInfo = document.createElement('div');
    countInfo.className = 'count-info';
    countInfo.textContent = `${links.length} profiles found`;
    linksContainer.appendChild(countInfo);

    // スタイルを追加
    const style = document.createElement('style');
    style.textContent = `
        .count-info {
            font-size: 1rem;
            color: #666;
            text-align: right;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e0e0e0;
        }
        .no-links {
            text-align: center;
            padding: 20px;
            color: #202124;
            font-size: 1.2rem;
        }
        .no-links p {
            margin: 10px 0;
        }
        .profile-name {
            font-weight: 500;
            margin-bottom: 5px;
            display: flex;
            align-items: center;
            font-size: 1.2rem;
        }
        .profile-details {
            font-size: 1rem;
            color: #444;
            display: flex;
            justify-content: space-between;
            margin-top: 5px;
        }
        .color-indicator {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            margin-right: 10px;
            border: 1px solid rgba(0, 0, 0, 0.2);
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
    `;
    document.head.appendChild(style);

    // リンクを生成
    links.forEach(link => {
        const linkItem = document.createElement('div');
        linkItem.className = 'link-item';

        const a = document.createElement('a');
        a.href = link.url; // 明示的に保存したURLを使用
        a.target = '_blank';
        
        // リンク内のコンテンツを構造化
        const profileNameElem = document.createElement('div');
        profileNameElem.className = 'profile-name';
        
        // 色が設定されている場合、色インジケーターを表示
        if (link.color) {
            const colorIndicator = document.createElement('span');
            colorIndicator.className = 'color-indicator';
            colorIndicator.style.backgroundColor = link.color;
            
            // 色の名前をツールチップとして表示
            const colorObj = availableColors.find(c => c.value === link.color);
            if (colorObj) {
                colorIndicator.title = colorObj.name;
            }
            
            profileNameElem.appendChild(colorIndicator);
        }
        
        // プロファイル名テキストを追加
        const profileNameText = document.createTextNode(link.profileName);
        profileNameElem.appendChild(profileNameText);
        
        const profileDetails = document.createElement('div');
        profileDetails.className = 'profile-details';
        profileDetails.innerHTML = `
            <span>Role: ${link.roleName}</span>
            <span>Account: ${link.accountId}</span>
        `;
        
        a.appendChild(profileNameElem);
        a.appendChild(profileDetails);
        
        linkItem.appendChild(a);
        
        linksContainer.appendChild(linkItem);
    });
}
