// Global variables
let currentSpeed = 160;
let lastDirection = 'down';

// Token system
let playerTokens = 5; // Starting tokens
window.playerTokens = playerTokens;

// Event tracking for one-time events
// These will be loaded from Firebase in initGame()
// Initialize with defaults for now
window.triggeredEvents = {
    visitedConnorRoomFirstTime: false,
    spellbookUnlocked: false,
    magnusSummoned: false,
    connorRoomPowerOn: false,
    bathroom2Unlocked: false,
    openingCinematicPlayed: false,
    laundryWashed: false
};

// Save data cache (loaded from Firebase during init)
window.lastSaveData = null;

// Global dialogue guard - prevents stacking and allows movement blocking

// Helper function to load character sprite sheets (for all scenes)
function loadCharacterSprites(scene) {
    const outfitFolder = window.currentOutfit === 'witch' ? 'dacia_witch' : 'dacia_comfy';
    console.log('🎭 Loading sprites from:', outfitFolder, '(currentOutfit =', window.currentOutfit + ')');
    
    scene.load.spritesheet('dacia-walk', `characters/${outfitFolder}/walk.png`, {
        frameWidth: 64,
        frameHeight: 64
    });
    scene.load.spritesheet('dacia-idle', `characters/${outfitFolder}/idle.png`, {
        frameWidth: 64,
        frameHeight: 64
    });
    scene.load.spritesheet('dacia-run', `characters/${outfitFolder}/run.png`, {
        frameWidth: 64,
        frameHeight: 64
    });
    scene.load.spritesheet('dacia-jump', `characters/${outfitFolder}/jump.png`, {
        frameWidth: 64,
        frameHeight: 64
    });
    scene.load.spritesheet('dacia-sit', `characters/${outfitFolder}/sit.png`, {
        frameWidth: 64,
        frameHeight: 64
    });
    scene.load.spritesheet('dacia-emote', `characters/${outfitFolder}/emote.png`, {
        frameWidth: 64,
        frameHeight: 64
    });
    scene.load.spritesheet('dacia-hurt', `characters/${outfitFolder}/hurt.png`, {
        frameWidth: 64,
        frameHeight: 64
    });
    scene.load.spritesheet('dacia-spellcast', `characters/${outfitFolder}/spellcast.png`, {
        frameWidth: 64,
        frameHeight: 64
    });
    scene.load.spritesheet('dacia-slash', `characters/${outfitFolder}/slash.png`, {
        frameWidth: 64,
        frameHeight: 64
    });
    scene.load.spritesheet('dacia-shoot', `characters/${outfitFolder}/shoot.png`, {
        frameWidth: 64,
        frameHeight: 64
    });
}

// Witch outfit idle behavior: spellcast every 5 seconds when idle
window.WitchIdleManager = {
    idleStartTime: null,
    lastSpellcastTime: null,
    isIdle: false,
    
    // Call this when player starts moving
    onMovementStart: function() {
        if (this.isIdle) {
            console.log('🧙‍♀️ Movement started, resetting idle timer');
        }
        this.isIdle = false;
        this.idleStartTime = null;
        this.lastSpellcastTime = null;
    },
    
    // Call this when player stops moving (in the else block of movement)
    onMovementStop: function() {
        if (!this.isIdle) {
            this.isIdle = true;
            this.idleStartTime = Date.now();
            this.lastSpellcastTime = null;
            console.log('🧙‍♀️ Started idle timer at', this.idleStartTime);
        }
    },
    
    // Call this every frame when idle to check if should play spellcast
    // Returns true if spellcast should be played
    shouldPlaySpellcast: function() {
        if (!this.isIdle || window.currentOutfit !== 'witch') return false;
        
        const now = Date.now();
        const timeSinceIdle = now - this.idleStartTime;
        
        // First spellcast after 5 seconds of being idle
        if (timeSinceIdle >= 5000 && this.lastSpellcastTime === null) {
            console.log('🧙‍♀️ Triggering first spellcast! Time idle:', timeSinceIdle, 'ms');
            this.lastSpellcastTime = now;
            return true;
        }
        
        // Subsequent spellcasts every 5 seconds
        if (this.lastSpellcastTime !== null && (now - this.lastSpellcastTime) >= 5000) {
            console.log('🧙‍♀️ Triggering repeat spellcast! Time since last:', now - this.lastSpellcastTime, 'ms');
            this.lastSpellcastTime = now;
            return true;
        }
        
        return false;
    }
};

// Helper function to play the correct idle animation
// Use this in the else block of all scene update methods
window.playIdleAnimation = function(player, direction) {
    // For witch outfit: stand still until it's time to cast
    if (window.currentOutfit === 'witch') {
        // Don't interrupt an ongoing spellcast animation
        if (player.anims.currentAnim && player.anims.currentAnim.key.startsWith('spellcast-')) {
            if (player.anims.isPlaying) {
                // Spellcast is already playing, don't interrupt it
                return;
            }
        }
        
        // Check if should cast spell
        if (window.WitchIdleManager.shouldPlaySpellcast()) {
            console.log('🧙‍♀️ Casting spell in direction:', direction);
            const animKey = 'spellcast-' + direction;
            console.log('🧙‍♀️ Playing animation:', animKey);
            
            // Play the animation
            player.anims.play(animKey, true);
            
            // Log when animation completes
            player.once('animationcomplete', (anim) => {
                console.log('🧙‍♀️ Animation completed:', anim.key);
            });
            
            // Also check if animation is actually registered
            if (!player.anims.exists(animKey)) {
                console.error('🧙‍♀️ ❌ Animation does not exist:', animKey);
            } else {
                const animData = player.anims.animationManager.get(animKey);
                console.log('🧙‍♀️ Animation data:', {
                    key: animData.key,
                    frames: animData.frames.length,
                    frameRate: animData.frameRate,
                    duration: animData.duration,
                    repeat: animData.repeat
                });
            }
        } else {
            // Use the first frame of the WALK sprite sheet (not idle, which is incomplete)
            // The walk sprite sheet has frames arranged in a 13x4 grid (13 columns, 4 rows)
            // Each row is a direction, with 8 frames of animation + 5 empty
            const frameMap = {
                'up': 0,      // Row 0, first frame
                'left': 13,   // Row 1, first frame  
                'down': 26,   // Row 2, first frame
                'right': 39   // Row 3, first frame
            };
            
            const frame = frameMap[direction] ?? 26; // Use ?? instead of || because 0 is valid!
            
            // Stop any current animation
            player.anims.stop();
            
            // Set the specific frame from the WALK sprite sheet
            player.setTexture('dacia-walk', frame);
        }
    } else {
        // Comfy outfit: play normal idle animation
        player.anims.play('idle-' + direction, true);
    }
};

// Comprehensive Save/Load System - FIREBASE VERSION
window.saveGame = async function(currentScene) {
    if (!window.currentPlayer) {
        console.error('No player selected, cannot save');
        return false;
    }
    
    const saveData = {
        triggeredEvents: window.triggeredEvents,
        currentOutfit: window.currentOutfit,
        currentScene: currentScene ? currentScene.scene.key : 'BedroomScene',
        playerPosition: currentScene && currentScene.player ? { x: currentScene.player.x, y: currentScene.player.y } : null,
        cdLibrary: window.cdLibrary,
        currentCD: window.currentCD,
        currentTrackIndex: window.currentTrackIndex,
        laundryExists: window.laundryExists,
        laundryPickedUp: window.laundryPickedUp,
        lastSaved: new Date().toISOString(),
        timestamp: Date.now()
    };
    
    // Save to Firebase
    try {
        const success = await window.saveGameState(window.currentPlayer, saveData);
        console.log('Game saved to Firebase:', saveData);
        
        // Show save indicator if we have a scene
        if (currentScene && success) {
            showSaveIndicator(currentScene);
        }
        
        return success;
    } catch (error) {
        console.error('Failed to save game:', error);
        return false;
    }
};

window.loadGame = async function() {
    if (!window.currentPlayer) {
        console.log('No player selected, cannot load');
        return null;
    }
    
    try {
        const data = await window.loadGameState(window.currentPlayer);
        console.log('Loading game from Firebase:', data);
        
        if (data) {
            // Restore all state
            if (data.triggeredEvents) window.triggeredEvents = data.triggeredEvents;
            if (data.currentOutfit) window.currentOutfit = data.currentOutfit;
            if (data.cdLibrary) {
                // Merge CD collection - preserve track arrays, update collected flags
                Object.keys(data.cdLibrary).forEach(cdKey => {
                    if (window.cdLibrary[cdKey]) {
                        window.cdLibrary[cdKey].collected = data.cdLibrary[cdKey].collected;
                    }
                });
            }
            if (data.currentCD !== undefined) window.currentCD = data.currentCD;
            if (data.currentTrackIndex !== undefined) window.currentTrackIndex = data.currentTrackIndex;
            if (data.laundryExists !== undefined) window.laundryExists = data.laundryExists;
            if (data.laundryPickedUp !== undefined) window.laundryPickedUp = data.laundryPickedUp;
        }
        
        return data;
    } catch (error) {
        console.error('Failed to load game:', error);
        return null;
    }
};

// Show spinning mushroom save indicator
function showSaveIndicator(scene) {
    // Create container for save indicator (bottom right)
    const container = scene.add.container(
        scene.cameras.main.width - 50, 
        scene.cameras.main.height - 30
    );
    container.setScrollFactor(0);
    container.setDepth(10000);
    
    // Mushroom emoji only (no text)
    const mushroom = scene.add.text(0, 0, '🍄', {
        fontSize: '20px'  // Smaller font size
    });
    mushroom.setOrigin(0.5);
    
    container.add([mushroom]);
    
    // Spin the mushroom
    scene.tweens.add({
        targets: mushroom,
        angle: 360,
        duration: 1000,
        repeat: 1
    });
    
    // Fade out and destroy after 1.5 seconds (half second shorter)
    scene.time.delayedCall(1500, () => {
        scene.tweens.add({
            targets: container,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                container.destroy();
            }
        });
    });
}

// Legacy function for backwards compatibility
window.saveTriggeredEvents = function() {
    localStorage.setItem('triggeredEvents', JSON.stringify(window.triggeredEvents));
    console.log('Saved triggeredEvents to localStorage:', window.triggeredEvents);
};

// Load save data at startup
const loadedSave = window.loadGame();
if (loadedSave) {
    console.log('Save data loaded successfully');
}

// Helper to get spawn position (from save or default)
// Note: This assumes save data has already been loaded into window.lastSaveData
window.getSpawnPosition = function(sceneKey, objectLayer, defaultX, defaultY, sceneData) {
    // Reset dialogue state on scene change
    
    // SPECIAL CASE: ConnorRoomScene → ConnorRoomScene2 (power-on cinematic)
    // Use the player's exact position from ConnorRoomScene
    if (sceneData && sceneData.from === 'ConnorRoomScene' && sceneKey === 'ConnorRoomScene2') {
        if (sceneData.playerPosition) {
            console.log(`Power-on transition! Using player position from ConnorRoomScene:`, sceneData.playerPosition);
            return { x: sceneData.playerPosition.x, y: sceneData.playerPosition.y };
        }
    }
    
    // If coming from another scene, NEVER use saved position - only use door spawn points
    if (sceneData && sceneData.from) {
        console.log(`Transitioning from ${sceneData.from} to ${sceneKey} - ignoring saved position`);
        
        // PRIORITY 1: Specific door spawn point (if provided)
        if (sceneData.spawnPoint && objectLayer) {
            const doorSpawn = objectLayer.objects.find(obj => obj.name === sceneData.spawnPoint);
            if (doorSpawn) {
                console.log(`Using door spawn point "${sceneData.spawnPoint}":`, doorSpawn.x, doorSpawn.y);
                return { x: doorSpawn.x, y: doorSpawn.y };
            }
        }
        
        // PRIORITY 2: Generic spawn point based on source scene
        if (objectLayer) {
            // Extract scene name and handle special cases
            let fromSceneName = sceneData.from.replace('Scene', '').toLowerCase();
            
            // Special handling for bathroom scenes - both use same spawn point
            if (fromSceneName === 'bathroom' || fromSceneName === 'bathroom2') {
                fromSceneName = 'bathroom';
            }
            // Special handling for connor's room (both versions use same spawn)
            else if (fromSceneName === 'connorroom' || fromSceneName === 'connorroom2') {
                fromSceneName = 'connor';
            }
            
            const spawnPointName = `spawn_from_${fromSceneName}`;
            
            const fromSceneSpawn = objectLayer.objects.find(obj => obj.name === spawnPointName);
            if (fromSceneSpawn) {
                console.log(`Using spawn point "${spawnPointName}" for transition:`, fromSceneSpawn.x, fromSceneSpawn.y);
                return { x: fromSceneSpawn.x, y: fromSceneSpawn.y };
            }
        }
        
        // PRIORITY 3: Fallback to default spawn point
        if (objectLayer) {
            const spawnPoint = objectLayer.objects.find(obj => obj.name === 'player_spawn');
            if (spawnPoint) {
                console.log(`Using default spawn point for ${sceneKey}:`, spawnPoint.x, spawnPoint.y);
                return { x: spawnPoint.x, y: spawnPoint.y };
            }
        }
    } else {
        // NOT coming from another scene - this is a reload/refresh
        // Use saved position if available
        if (window.lastSaveData && window.lastSaveData.currentScene === sceneKey && window.lastSaveData.playerPosition) {
            console.log(`Loading saved position for ${sceneKey}:`, window.lastSaveData.playerPosition);
            return { x: window.lastSaveData.playerPosition.x, y: window.lastSaveData.playerPosition.y };
        }
        
        // Fallback to default spawn point
        if (objectLayer) {
            const spawnPoint = objectLayer.objects.find(obj => obj.name === 'player_spawn');
            if (spawnPoint) {
                console.log(`Using default spawn point for ${sceneKey}:`, spawnPoint.x, spawnPoint.y);
                return { x: spawnPoint.x, y: spawnPoint.y };
            }
        }
    }
    
    // Ultimate fallback to hardcoded defaults
    console.log(`Using hardcoded default position for ${sceneKey}:`, defaultX, defaultY);
    return { x: defaultX || 200, y: defaultY || 200 };
};

// Laundry and outfit system
// Only initialize if not already set (might be loaded from save)
if (window.laundryExists === undefined) {
    // Check if triggeredEvents exists and has the laundryWashed property
    window.laundryExists = !(window.triggeredEvents && window.triggeredEvents.laundryWashed);
}
if (window.laundryPickedUp === undefined) {
    window.laundryPickedUp = false;
}
if (window.currentOutfit === undefined) {
    window.currentOutfit = 'comfy'; // Don't use localStorage anymore
    console.log('Using default outfit:', window.currentOutfit);
}

// Global Music Manager - ensures only one music source plays at a time
window.MusicManager = {
    currentMusic: null,
    currentType: null, // 'cd', 'event', 'weed'
    
    play: function(soundObject, type) {
        console.log('MusicManager: Playing', type);
        
        // Stop any currently playing music
        this.stopAll();
        
        // Set new music
        this.currentMusic = soundObject;
        this.currentType = type;
        
        if (soundObject && !soundObject.isPlaying) {
            soundObject.play();
        }
    },
    
    stopAll: function() {
        if (this.currentMusic && this.currentMusic.isPlaying) {
            console.log('MusicManager: Stopping', this.currentType);
            this.currentMusic.stop();
        }
        this.currentMusic = null;
        this.currentType = null;
    },
    
    pause: function() {
        if (this.currentMusic && this.currentMusic.isPlaying) {
            console.log('MusicManager: Pausing', this.currentType);
            this.currentMusic.pause();
        }
    },
    
    resume: function() {
        if (this.currentMusic && !this.currentMusic.isPlaying) {
            console.log('MusicManager: Resuming', this.currentType);
            this.currentMusic.resume();
        }
    },
    
    isPlaying: function() {
        return this.currentMusic && this.currentMusic.isPlaying;
    },
    
    getCurrentType: function() {
        return this.currentType;
    }
};

// CD Collection System
const cdLibrary = {
    'to_dacia': {
        name: 'To Dacia ❤️',
        collected: false,
        tracks: [] // Will be populated dynamically
    },
    'edm': {
        name: 'EDM Bangers',
        collected: false,
        tracks: [] // Will be populated dynamically
    },
    'bg': {
        name: 'Background Music 🎶',
        collected: true, // Pre-unlocked
        tracks: [] // Will be populated dynamically
    }
};

// Populate CD tracks dynamically
// For to_dacia - 5 tracks
for (let i = 1; i <= 5; i++) {
    cdLibrary.to_dacia.tracks.push(`sounds/cds/to_dacia/track${i}.mp3`);
}

// For edm - 4 tracks
for (let i = 1; i <= 4; i++) {
    cdLibrary.edm.tracks.push(`sounds/cds/edm/track${i}.mp3`);
}

// For bg - 1 track
for (let i = 1; i <= 1; i++) {
    cdLibrary.bg.tracks.push(`sounds/cds/bg/track${i}.mp3`);
}

// Music player state
let currentCD = null;
let currentTrackIndex = 0;
let currentMusic = null;

window.cdLibrary = cdLibrary;
window.currentCD = currentCD;
window.currentTrackIndex = currentTrackIndex;

// Helper to update direction globally
function setLastDirection(direction) {
    lastDirection = direction;
    window.lastDirection = direction;
}

// Initialize
setLastDirection('down');
            window.WitchIdleManager.onMovementStart();

// Firebase Save/Load Functions are now defined in index.html
// (They need to load before player selection code runs)


// Apartment Scene
class ApartmentScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ApartmentScene' });
    }

    preload() {
        console.log('Loading apartment assets...');
        
        // Load apartment tilesets
        this.load.image('3d_walls', 'tilesets/3d_walls.png');
        this.load.image('basement', 'tilesets/basement.png');
        this.load.image('bedroom', 'tilesets/bedroom.png');
        this.load.image('generic', 'tilesets/generic.png');
        this.load.image('grocery', 'tilesets/grocery.png');
        this.load.image('halloween', 'tilesets/halloween.png');
        this.load.image('home_1', 'tilesets/home_1.png');
        this.load.image('home_2', 'tilesets/home_2.png');
        this.load.image('kitchen', 'tilesets/kitchen.png');
        this.load.image('living_room', 'tilesets/living_room.png');
        this.load.image('room_builder', 'tilesets/room_builder.png');
        this.load.image('tv', 'tilesets/tv.png');
        
        // Load apartment map
        this.load.tilemapTiledJSON('apartment', 'maps/dacia_apartment.json');
        
        // Load character animation spritesheets based on current outfit
        const outfitFolder = window.currentOutfit === 'witch' ? 'dacia_witch' : 'dacia_comfy';
        console.log('ApartmentScene loading sprites from:', outfitFolder);
        
        // Load character animation spritesheets
        this.load.spritesheet('dacia-walk', `characters/${outfitFolder}/walk.png`, {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('dacia-idle', `characters/${outfitFolder}/idle.png`, {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('dacia-run', `characters/${outfitFolder}/run.png`, {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('dacia-jump', `characters/${outfitFolder}/jump.png`, {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('dacia-sit', `characters/${outfitFolder}/sit.png`, {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('dacia-emote', `characters/${outfitFolder}/emote.png`, {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('dacia-hurt', `characters/${outfitFolder}/hurt.png`, {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('dacia-spellcast', `characters/${outfitFolder}/spellcast.png`, {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('dacia-slash', `characters/${outfitFolder}/slash.png`, {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('dacia-shoot', `characters/${outfitFolder}/shoot.png`, {
            frameWidth: 64,
            frameHeight: 64
        });
        
        // Load sounds
        this.load.audio('bgMusic', 'sounds/background_music.mp3');
        this.load.audio('buttonPress', 'sounds/button_press.mp3');
        this.load.audio('doorSound', 'sounds/door_sound.mp3');
        this.load.audio('weedSong', 'sounds/weedsong.mp3');
        
        // Load player NPC sprite
        this.load.spritesheet('player_npc', 'characters/player_character.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        
        // Load UI dialogue box
        this.load.image('dialogueBox', 'ui/dialogue_box.png');
    }

    create() {
        console.log('Creating apartment...');
        
        // Create the map
        const map = this.make.tilemap({ key: 'apartment' });
        
        // Set physics world bounds to match the MAP size, not canvas
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        
        // Add all tilesets
        const allTilesets = [
            map.addTilesetImage('3d_walls', '3d_walls'),
            map.addTilesetImage('basement', 'basement'),
            map.addTilesetImage('bedroom', 'bedroom'),
            map.addTilesetImage('generic', 'generic'),
            map.addTilesetImage('grocery', 'grocery'),
            map.addTilesetImage('halloween', 'halloween'),
            map.addTilesetImage('home_1', 'home_1'),
            map.addTilesetImage('home_2', 'home_2'),
            map.addTilesetImage('kitchen', 'kitchen'),
            map.addTilesetImage('living_room', 'living_room'),
            map.addTilesetImage('room_builder', 'room_builder'),
            map.addTilesetImage('tv', 'tv')
        ];
        
        // Create layers
        const floorLayer = map.createLayer('floor', allTilesets, 0, 0);
        const wallsLayer = map.createLayer('walls', allTilesets, 0, 0);
        const onWallsLayer = map.createLayer('on_walls', allTilesets, 0, 0);
        const onFloorLayer = map.createLayer('on_floor', allTilesets, 0, 0);
        const nextUpLayer = map.createLayer('next_up', allTilesets, 0, 0);
        const stuffLayer = map.createLayer('stuff', allTilesets, 0, 0);
        const topLayer = map.createLayer('top', allTilesets, 0, 0);
        const collisionLayer = map.createLayer('collision', allTilesets, 0, 0);
        
        // Hide and set collision
        if (collisionLayer) {
            collisionLayer.setVisible(false);
            collisionLayer.setCollisionByExclusion([-1]);
        }
        
        // Get spawn position (from save or scene transition)
        const objectLayer = map.getObjectLayer('objects');
        const fromScene = this.scene.settings.data?.from;
        
        // Use getSpawnPosition helper - checks door spawns, then saved position
        const spawn = window.getSpawnPosition('ApartmentScene', objectLayer, 400, 400, this.scene.settings.data);
        
        // Create player
        this.player = this.physics.add.sprite(spawn.x, spawn.y, 'dacia-idle');
        this.player.setCollideWorldBounds(true);
        this.player.setSize(20, 20);
        this.player.setOffset(22, 44);
        this.player.setDepth(10); // Set explicit depth so followers can render behind
        
        // Set up collision
        if (collisionLayer) {
            this.physics.add.collider(this.player, collisionLayer);
        }
        
        // Add collision objects
        const collisionObjectsLayer = map.getObjectLayer('collision_objects');
        if (collisionObjectsLayer) {
            collisionObjectsLayer.objects.forEach(obj => {
                const collisionRect = this.add.rectangle(obj.x, obj.y, obj.width, obj.height);
                collisionRect.setOrigin(0, 0);
                this.physics.add.existing(collisionRect, true);
                this.physics.add.collider(this.player, collisionRect);
            });
        }
        
        // Camera
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        
        // Create animations
        createAnimations(this);
        
        // Set up sounds (no background music - silence unless CD or event music plays)
        this.buttonSound = this.sound.add('buttonPress', { volume: 0.5 });
        this.doorSound = this.sound.add('doorSound', { volume: 0.6 });
        
        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.actionKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // Set up door interaction - auto trigger on overlap
        if (objectLayer) {
            const door = objectLayer.objects.find(obj => obj.name === 'door_to_bedroom');
            if (door) {
                this.doorZone = this.add.zone(door.x, door.y, door.width || 32, door.height || 32);
                this.doorZone.setOrigin(0, 0);
                this.physics.add.existing(this.doorZone, true);
                
                this.doorTriggered = false;
                
                this.physics.add.overlap(this.player, this.doorZone, () => {
                    if (!this.doorTriggered) {
                        this.doorTriggered = true;
                        this.doorSound.play();
                        
                        // End high effect if active
                        if (window.isHigh) {
                            this.endHighEffect();
                        }
                        
                        // End drunk effect if active
                        if (window.isDrunk) {
                            window.isDrunk = false;
                            if (this.drunkEffectTimer) {
                                this.drunkEffectTimer.destroy();
                                this.drunkEffectTimer = null;
                            }
                            if (this.rainbowEffectActive) {
                                this.endRainbowEffect();
                            }
                        }
                        
                        this.time.delayedCall(200, () => {
                            this.scene.start('BedroomScene', { from: 'ApartmentScene' });
                        });
                    }
                }, null, this);
            }
            
            // Set up door to Connor's room
            const connorDoor = objectLayer.objects.find(obj => obj.name === 'door_to_connor');
            if (connorDoor) {
                this.connorDoorZone = this.add.zone(connorDoor.x, connorDoor.y, connorDoor.width || 32, connorDoor.height || 32);
                this.connorDoorZone.setOrigin(0, 0);
                this.physics.add.existing(this.connorDoorZone, true);
                
                this.connorDoorTriggered = false;
                
                this.physics.add.overlap(this.player, this.connorDoorZone, () => {
                    if (!this.connorDoorTriggered) {
                        this.connorDoorTriggered = true;
                        this.doorSound.play();
                        
                        // End high effect if active
                        if (window.isHigh) {
                            this.endHighEffect();
                        }
                        
                        // End drunk effect if active
                        if (window.isDrunk) {
                            window.isDrunk = false;
                            if (this.drunkEffectTimer) {
                                this.drunkEffectTimer.destroy();
                                this.drunkEffectTimer = null;
                            }
                            if (this.rainbowEffectActive) {
                                this.endRainbowEffect();
                            }
                        }
                        
                        this.time.delayedCall(200, () => {
                            // Check if power has been turned on - if so, go to ConnorRoomScene2
                            if (window.triggeredEvents?.connorRoomPowerOn) {
                                this.scene.start('ConnorRoomScene2', { from: 'ApartmentScene' });
                            } else {
                                this.scene.start('ConnorRoomScene', { from: 'ApartmentScene' });
                            }
                        });
                    }
                }, null, this);
            }
            
            // Set up door to bathroom
            const bathroomDoor = objectLayer.objects.find(obj => obj.name === 'door_to_bathroom');
            if (bathroomDoor) {
                this.bathroomDoorZone = this.add.zone(bathroomDoor.x, bathroomDoor.y, 
                                                       bathroomDoor.width || 32, bathroomDoor.height || 32);
                this.bathroomDoorZone.setOrigin(0, 0);
                this.physics.add.existing(this.bathroomDoorZone, true);
                
                this.bathroomDoorTriggered = false;
                
                this.physics.add.overlap(this.player, this.bathroomDoorZone, () => {
                    if (!this.bathroomDoorTriggered) {
                        this.bathroomDoorTriggered = true;
                        this.doorSound.play();
                        
                        // End high effect if active
                        if (window.isHigh) {
                            this.endHighEffect();
                        }
                        
                        // End drunk effect if active
                        if (window.isDrunk) {
                            window.isDrunk = false;
                            if (this.drunkEffectTimer) {
                                this.drunkEffectTimer.destroy();
                                this.drunkEffectTimer = null;
                            }
                            if (this.rainbowEffectActive) {
                                this.endRainbowEffect();
                            }
                        }
                        
                        this.time.delayedCall(200, () => {
                            // Go to BathroomScene2 if unlocked, otherwise regular BathroomScene
                            if (window.triggeredEvents?.bathroom2Unlocked) {
                                this.scene.start('BathroomScene2', { from: 'ApartmentScene' });
                            } else {
                                this.scene.start('BathroomScene', { from: 'ApartmentScene' });
                            }
                        });
                    }
                }, null, this);
            }
            
            // Set up orange interaction
            const orange = objectLayer.objects.find(obj => obj.name === 'orange');
            if (orange) {
                this.orangeZone = this.add.zone(orange.x, orange.y, orange.width || 32, orange.height || 32);
                this.orangeZone.setOrigin(0, 0);
                this.physics.add.existing(this.orangeZone, true);
                this.nearOrange = false;
                
                this.physics.add.overlap(this.player, this.orangeZone, () => {
                    this.nearOrange = true;
                }, null, this);
            }
            
            // Set up food interaction
            const food = objectLayer.objects.find(obj => obj.name === 'food');
            if (food) {
                this.foodZone = this.add.zone(food.x, food.y, food.width || 32, food.height || 32);
                this.foodZone.setOrigin(0, 0);
                this.physics.add.existing(this.foodZone, true);
                this.nearFood = false;
                
                this.physics.add.overlap(this.player, this.foodZone, () => {
                    this.nearFood = true;
                }, null, this);
            }
            
            // Set up game (arcade machine) interaction
            const game = objectLayer.objects.find(obj => obj.name === 'game');
            if (game) {
                this.gameZone = this.add.zone(game.x, game.y, game.width || 32, game.height || 32);
                this.gameZone.setOrigin(0, 0);
                this.physics.add.existing(this.gameZone, true);
                this.nearGame = false;
                
                this.physics.add.overlap(this.player, this.gameZone, () => {
                    this.nearGame = true;
                }, null, this);
            }
            
            // Set up soju interaction
            const soju = objectLayer.objects.find(obj => obj.name === 'soju');
            if (soju) {
                this.sojuZone = this.add.zone(soju.x, soju.y, soju.width || 32, soju.height || 32);
                this.sojuZone.setOrigin(0, 0);
                this.physics.add.existing(this.sojuZone, true);
                this.nearSoju = false;
                
                this.physics.add.overlap(this.player, this.sojuZone, () => {
                    this.nearSoju = true;
                }, null, this);
            }
            
            // Set up joint interaction
            const joint = objectLayer.objects.find(obj => obj.name === 'joint');
            if (joint) {
                this.jointZone = this.add.zone(joint.x, joint.y, joint.width || 32, joint.height || 32);
                this.jointZone.setOrigin(0, 0);
                this.physics.add.existing(this.jointZone, true);
                this.nearJoint = false;
                
                this.physics.add.overlap(this.player, this.jointZone, () => {
                    this.nearJoint = true;
                }, null, this);
            }
            
            // Create NPC (you!)
            const npcObject = objectLayer.objects.find(obj => obj.name === 'npc_player');
            if (npcObject) {
                this.npc = this.physics.add.sprite(npcObject.x, npcObject.y, 'player_npc');
                this.npc.setFrame(10 * 13); // Standing facing down (row 10, frame 0)
                this.npc.body.setImmovable(true);
                
                // Create interaction zone around NPC
                this.npcZone = this.add.zone(npcObject.x, npcObject.y, 64, 64);
                this.npcZone.setOrigin(0.5, 0.5);
                this.physics.add.existing(this.npcZone, true);
                
                this.nearNPC = false;
                
                this.physics.add.overlap(this.player, this.npcZone, () => {
                    this.nearNPC = true;
                }, null, this);
            }
        }
        
        // Dialogue system variables
        this.dialogueActive = false;
        this.dialogueMessages = [
            "Hey babe! Welcome to our game!",
            "I made this for you for Christmas.",
            "I hope you love it as much as I love you! ❤️"
        ];
        this.currentDialogueIndex = 0;
        
        console.log('Apartment created!');
        
        // Autosave when entering scene
        this.time.delayedCall(500, () => {
            window.saveGame(this);
        });
        
        // Resume CD if we were playing one and nothing is currently playing
        if (window.currentCD && !window.MusicManager.isPlaying()) {
            // Use a small delay to ensure scene is fully loaded
            this.time.delayedCall(100, () => {
                console.log('Attempting to resume CD in ApartmentScene');
                this.resumeCD();
            });
        }
        
        // Initialize Magnus summon state
        this.summonedNPC = null;
        this.summonTimer = null;
        this.lastRecordedPlayerPosition = null;
        this.magnusTargetPosition = null;
        
        // Check if Magnus should be active from previous scene
        checkAndRestoreMagnus(this);
    }
    
    resumeCD() {
        if (!window.currentCD) return;
        
        const cd = window.cdLibrary[window.currentCD];
        if (!cd || window.currentTrackIndex >= cd.tracks.length) {
            window.currentTrackIndex = 0;
        }
        
        const trackPath = cd.tracks[window.currentTrackIndex];
        console.log('Attempting to play track:', trackPath, 'index:', window.currentTrackIndex);
        
        // Check if track is already loaded
        if (!this.sound.get(trackPath)) {
            console.log('Loading track:', trackPath);
            this.load.audio(trackPath, trackPath);
            this.load.once('complete', () => {
                console.log('Track loaded:', trackPath);
                const music = this.sound.add(trackPath, { volume: 0.3 });
                window.MusicManager.play(music, 'cd');
                
                // When track ends, advance to next track
                music.once('complete', () => {
                    console.log('Track complete, advancing...');
                    window.currentTrackIndex++;
                    // Find the active scene with resumeCD or playNextTrack
                    const activeScene = this.scene.manager.getScenes(true)[0];
                    if (activeScene && activeScene.resumeCD) {
                        activeScene.resumeCD();
                    } else if (activeScene && activeScene.playNextTrack) {
                        activeScene.playNextTrack();
                    }
                });
            });
            this.load.start();
        } else {
            console.log('Track already loaded, playing:', trackPath);
            const music = this.sound.get(trackPath);
            window.MusicManager.play(music, 'cd');
            
            music.once('complete', () => {
                console.log('Track complete, advancing...');
                window.currentTrackIndex++;
                // Find the active scene with resumeCD or playNextTrack
                const activeScene = this.scene.manager.getScenes(true)[0];
                if (activeScene && activeScene.resumeCD) {
                    activeScene.resumeCD();
                } else if (activeScene && activeScene.playNextTrack) {
                    activeScene.playNextTrack();
                }
            });
        }
    }

    // Magnus summon system - uses global function
    summonMagnus(skipGreeting = false) {
        window.globalSummonMagnus(this, skipGreeting);
    }
    
    dismissMagnus() {
        window.globalDismissMagnus(this);
    }

    update() {
        // Update Magnus follower AI FIRST - runs even during cutscenes/dialogues
        window.updateMagnusAI(this);
        
        // Regular update logic
        if (!this.player || this.simpleDialogueOpen || this.sojuPromptOpen || this.jointPromptOpen || this.arcadePromptOpen || this.arcadeGameActive) return;
        
        this.player.setVelocity(0);
        
        // Check keyboard OR touch controls
        const touchControls = window.touchControls || {};
        
        // Track button states BEFORE checking presses
        const lastA = this.lastAPressed || false;
        this.lastAPressed = touchControls.a || false;
        
        const leftPressed = this.cursors.left.isDown || touchControls.left;
        const rightPressed = this.cursors.right.isDown || touchControls.right;
        const upPressed = this.cursors.up.isDown || touchControls.up;
        const downPressed = this.cursors.down.isDown || touchControls.down;
        const aPressed = Phaser.Input.Keyboard.JustDown(this.actionKey) || (touchControls.a && !lastA);
        
        // Manually check overlaps every frame (more reliable than callbacks)
        if (this.npcZone) {
            this.nearNPC = this.physics.overlap(this.player, this.npcZone);
        }
        if (this.orangeZone) {
            this.nearOrange = this.physics.overlap(this.player, this.orangeZone);
        }
        if (this.foodZone) {
            this.nearFood = this.physics.overlap(this.player, this.foodZone);
        }
        if (this.gameZone) {
            this.nearGame = this.physics.overlap(this.player, this.gameZone);
        }
        if (this.sojuZone) {
            this.nearSoju = this.physics.overlap(this.player, this.sojuZone);
        }
        if (this.jointZone) {
            this.nearJoint = this.physics.overlap(this.player, this.jointZone);
        }
        
        // DEBUG: Log A button state (only when actually pressed to avoid spam)
        if (aPressed) {
            console.log('[A Button Debug]', {
                scene: 'ApartmentScene',
                aPressed: aPressed,
                'touchControls.a': touchControls.a,
                lastA: lastA,
                'space.isDown': this.cursors.space.isDown,
                'JustDown': Phaser.Input.Keyboard.JustDown(this.actionKey),
                dialogueActive: this.dialogueActive,
                simpleDialogueOpen: this.simpleDialogueOpen,
                sojuPromptOpen: this.sojuPromptOpen,
                nearNPC: this.nearNPC,
                nearOrange: this.nearOrange,
                nearFood: this.nearFood,
                nearGame: this.nearGame,
                nearSoju: this.nearSoju
            });
        }
        
        // Handle dialogue
        if (this.dialogueActive) {
            if (aPressed) {
                console.log('[A Button] Advancing dialogue');
                this.buttonSound.play();
                this.advanceDialogue();
            }
            this.nearNPC = false;
            return; // Don't allow movement during dialogue
        }
        
        // Check if near NPC and A pressed
        if (this.nearNPC && aPressed) {
            console.log('[A Button] Starting NPC dialogue');
            this.buttonSound.play();
            this.startDialogue();
        }
        // Check if near orange and A is pressed
        else if (this.nearOrange && aPressed) {
            console.log('[A Button] Orange interaction triggered!');
            this.buttonSound.play();
            this.showSimpleDialogue('ORANGE!');
        }
        // Check if near food and A is pressed
        else if (this.nearFood && aPressed) {
            console.log('[A Button] Food interaction triggered!');
            this.buttonSound.play();
            this.showSimpleDialogue("Damn, i'm chefing!");
        }
        // Check if near game and A is pressed
        else if (this.nearGame && aPressed) {
            console.log('[A Button] Game interaction triggered!');
            this.buttonSound.play();
            this.showArcadePrompt();
        }
        // Check if near soju and A is pressed
        else if (this.nearSoju && aPressed) {
            console.log('[A Button] Soju interaction triggered!');
            this.buttonSound.play();
            this.showSojuPrompt();
        }
        // Check if near joint and A is pressed
        else if (this.nearJoint && aPressed) {
            console.log('[A Button] Joint interaction triggered!');
            this.buttonSound.play();
            this.showJointPrompt();
        }
        
        // Movement (inverted if drunk)
        if (window.isDrunk) {
            // Drunk controls - inverted!
            if (leftPressed) {
                this.player.setVelocityX(currentSpeed); // Right instead of left
                this.player.anims.play('walk-right', true);
                setLastDirection('right');
                window.WitchIdleManager.onMovementStart();
            } else if (rightPressed) {
                this.player.setVelocityX(-currentSpeed); // Left instead of right
                this.player.anims.play('walk-left', true);
                setLastDirection('left');
                window.WitchIdleManager.onMovementStart();
            } else if (upPressed) {
                this.player.setVelocityY(currentSpeed); // Down instead of up
                this.player.anims.play('walk-down', true);
                setLastDirection('down');
                window.WitchIdleManager.onMovementStart();
            } else if (downPressed) {
                this.player.setVelocityY(-currentSpeed); // Up instead of down
                this.player.anims.play('walk-up', true);
                setLastDirection('up');
                window.WitchIdleManager.onMovementStart();
            } else {
                window.WitchIdleManager.onMovementStop();
                window.playIdleAnimation(this.player, lastDirection);
            }
        } else {
            // Normal controls
            if (leftPressed) {
                this.player.setVelocityX(-currentSpeed);
                this.player.anims.play('walk-left', true);
                setLastDirection('left');
                window.WitchIdleManager.onMovementStart();
            } else if (rightPressed) {
                this.player.setVelocityX(currentSpeed);
                this.player.anims.play('walk-right', true);
                setLastDirection('right');
                window.WitchIdleManager.onMovementStart();
            } else if (upPressed) {
                this.player.setVelocityY(-currentSpeed);
                this.player.anims.play('walk-up', true);
                setLastDirection('up');
                window.WitchIdleManager.onMovementStart();
            } else if (downPressed) {
                this.player.setVelocityY(currentSpeed);
                this.player.anims.play('walk-down', true);
                setLastDirection('down');
                window.WitchIdleManager.onMovementStart();
            } else {
                window.WitchIdleManager.onMovementStop();
                window.playIdleAnimation(this.player, lastDirection);
            }
        }
        
        // Update Magnus checkpoint tracking
        window.updateMagnusCheckpoints(this);
    }
    
    startDialogue() {
        this.dialogueActive = true;
        this.currentDialogueIndex = 0;
        this.player.setVelocity(0);
        
        // Create dialogue box at bottom of screen
        const boxY = this.cameras.main.height - 100;
        
        this.dialogueBox = this.add.image(this.cameras.main.centerX, boxY, 'dialogueBox');
        this.dialogueBox.setOrigin(0.5, 0.5);
        this.dialogueBox.setScrollFactor(0);
        this.dialogueBox.setDepth(999);
        this.dialogueBox.setDisplaySize(this.cameras.main.width - 40, 120);
        
        this.dialogueText = this.add.text(
            this.cameras.main.centerX,
            boxY,
            this.dialogueMessages[0],
            {
                fontSize: '17px',
                color: '#000000',
                align: 'left',
                wordWrap: { width: this.cameras.main.width - 80 }
            }
        );
        this.dialogueText.setOrigin(0.5, 0.5);
        this.dialogueText.setScrollFactor(0);
        this.dialogueText.setDepth(1000);
    }
    
    showSimpleDialogue(message) {
        this.simpleDialogueOpen = true;
        this.player.setVelocity(0);
        
        const dialogue = createDialogueBox(this, message);
        this.simpleDialogueBox = dialogue.box;
        this.simpleDialogueText = dialogue.text;
        
        // Wait before allowing close
        this.time.delayedCall(50, () => {
            this.canCloseSimpleDialogue = true;
        });
        
        const touchControls = window.touchControls || {};
        this.lastSimpleA = touchControls.a || false;
        this.lastSimpleB = touchControls.b || false;
        
        // Close handler
        const closeDialogue = () => {
            if (!this.canCloseSimpleDialogue) {
                this.lastSimpleA = touchControls.a || false;
                this.lastSimpleB = touchControls.b || false;
                return;
            }
            
            const aPressed = (touchControls.a && !this.lastSimpleA);
            const bPressed = (touchControls.b && !this.lastSimpleB);
            const spacePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aPressed || bPressed || spacePressed) {
                this.buttonSound.play();
                
                if (this.simpleDialogueBox && this.simpleDialogueBox.scene) {
                    this.simpleDialogueBox.destroy();
                }
                if (this.simpleDialogueText && this.simpleDialogueText.scene) {
                    this.simpleDialogueText.destroy();
                }
                
                this.simpleDialogueOpen = false;
                this.events.off('update', closeDialogue);
            }
            
            this.lastSimpleA = touchControls.a || false;
            this.lastSimpleB = touchControls.b || false;
        };
        
        this.events.on('update', closeDialogue);
    }
    
    showSojuPrompt() {
        this.sojuPromptOpen = true;
        this.player.setVelocity(0);
        
        // Create menu box (smaller than CD menu)
        const boxWidth = Math.min(320, this.cameras.main.width - 80);
        const boxHeight = 160;
        const boxX = this.cameras.main.centerX;
        const boxY = this.cameras.main.centerY;
        
        // Create menu graphics
        const graphics = this.add.graphics();
        graphics.setScrollFactor(0);
        graphics.setDepth(999);
        
        // Shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(boxX - boxWidth/2 + 3, boxY - boxHeight/2 + 3, boxWidth, boxHeight, 4);
        
        // Pink border
        graphics.fillStyle(0xf0a0c8, 1);
        graphics.fillRoundedRect(boxX - boxWidth/2, boxY - boxHeight/2, boxWidth, boxHeight, 4);
        
        // Cream background
        graphics.fillStyle(0xfff8f0, 1);
        graphics.fillRoundedRect(boxX - boxWidth/2 + 5, boxY - boxHeight/2 + 5, boxWidth - 10, boxHeight - 10, 3);
        
        // Corner accents
        const accentColor = 0xe891b8;
        const cornerOffset = 12;
        graphics.fillStyle(accentColor, 1);
        graphics.fillCircle(boxX - boxWidth/2 + cornerOffset, boxY - boxHeight/2 + cornerOffset, 3);
        graphics.fillCircle(boxX + boxWidth/2 - cornerOffset, boxY - boxHeight/2 + cornerOffset, 3);
        graphics.fillCircle(boxX - boxWidth/2 + cornerOffset, boxY + boxHeight/2 - cornerOffset, 3);
        graphics.fillCircle(boxX + boxWidth/2 - cornerOffset, boxY + boxHeight/2 - cornerOffset, 3);
        
        this.sojuPromptBox = graphics;
        
        // Title/Question
        const titleText = this.add.text(boxX, boxY - boxHeight/2 + 35, 'Soju! Take a drink?', {
            fontSize: '17px',
            fontFamily: 'Arial, sans-serif',
            color: '#000000',
            fontStyle: 'bold'
        });
        titleText.setOrigin(0.5);
        titleText.setScrollFactor(0);
        titleText.setDepth(1000);
        this.sojuPromptTitle = titleText;
        
        // Yes option
        this.yesText = this.add.text(boxX, boxY - 10, 'Yes', {
            fontSize: '17px',
            fontFamily: 'Arial, sans-serif',
            color: '#e891b8', // Pink for selected
            fontStyle: 'bold'
        });
        this.yesText.setOrigin(0.5);
        this.yesText.setScrollFactor(0);
        this.yesText.setDepth(1000);
        
        // No option
        this.noText = this.add.text(boxX, boxY + 20, 'No', {
            fontSize: '17px',
            fontFamily: 'Arial, sans-serif',
            color: '#000000', // Black for unselected
            fontStyle: 'normal'
        });
        this.noText.setOrigin(0.5);
        this.noText.setScrollFactor(0);
        this.noText.setDepth(1000);
        
        // Instructions
        const instructText = this.add.text(boxX, boxY + boxHeight/2 - 20, 
            '↑↓ to select • A to confirm • B to cancel', {
            fontSize: '11px',
            fontFamily: 'Arial, sans-serif',
            color: '#666666'
        });
        instructText.setOrigin(0.5);
        instructText.setScrollFactor(0);
        instructText.setDepth(1000);
        this.sojuInstructText = instructText;
        
        // Selection state
        this.sojuSelection = 'yes'; // Default to yes
        
        const touchControls = window.touchControls || {};
        this.lastSojuA = touchControls.a || false;
        this.lastSojuB = touchControls.b || false;
        this.lastSojuUp = touchControls.up || false;
        this.lastSojuDown = touchControls.down || false;
        
        // Handle selection
        const handleSelection = () => {
            const upPressed = this.cursors.up.isDown || (touchControls.up && !this.lastSojuUp);
            const downPressed = this.cursors.down.isDown || (touchControls.down && !this.lastSojuDown);
            const aPressed = Phaser.Input.Keyboard.JustDown(this.actionKey) || (touchControls.a && !this.lastSojuA);
            const bPressed = (touchControls.b && !this.lastSojuB);
            
            // Change selection with up/down
            if (upPressed && this.sojuSelection === 'no') {
                this.buttonSound.play();
                this.sojuSelection = 'yes';
                // Pink for selected, black for unselected
                this.yesText.setStyle({ color: '#e891b8', fontStyle: 'bold' });
                this.noText.setStyle({ color: '#000000', fontStyle: 'normal' });
            } else if (downPressed && this.sojuSelection === 'yes') {
                this.buttonSound.play();
                this.sojuSelection = 'no';
                this.yesText.setStyle({ color: '#000000', fontStyle: 'normal' });
                this.noText.setStyle({ color: '#e891b8', fontStyle: 'bold' });
            }
            
            // Confirm selection with A or B (B = cancel/no)
            if (aPressed || bPressed) {
                this.buttonSound.play();
                
                // Clean up prompt
                if (this.sojuPromptBox && this.sojuPromptBox.scene) {
                    this.sojuPromptBox.destroy();
                }
                if (this.sojuPromptTitle && this.sojuPromptTitle.scene) {
                    this.sojuPromptTitle.destroy();
                }
                if (this.yesText && this.yesText.scene) {
                    this.yesText.destroy();
                }
                if (this.noText && this.noText.scene) {
                    this.noText.destroy();
                }
                if (this.sojuInstructText && this.sojuInstructText.scene) {
                    this.sojuInstructText.destroy();
                }
                
                this.sojuPromptOpen = false;
                this.events.off('update', handleSelection);
                
                // If B pressed or selection is 'no', just close
                // If A pressed and selection is 'yes', drink!
                if (aPressed && this.sojuSelection === 'yes') {
                    this.drinkSoju();
                }
            }
            
            this.lastSojuA = touchControls.a || false;
            this.lastSojuB = touchControls.b || false;
            this.lastSojuUp = touchControls.up || false;
            this.lastSojuDown = touchControls.down || false;
        };
        
        this.events.on('update', handleSelection);
    }
    
    drinkSoju() {
        console.log('Drinking soju!');
        
        // Enable inverted controls
        window.isDrunk = true;
        
        // Check if also high - CROSSFADED!
        if (window.isHigh) {
            console.log('CROSSFADED! Starting rainbow effect!');
            this.startRainbowEffect();
        }
        
        // Start camera shake (25 seconds, subtle intensity)
        this.cameras.main.shake(25000, 0.008);
        
        // Multiple zoom in/out cycles (adjusted for 25 seconds)
        // Cycle 1: Zoom in (0-2s)
        this.cameras.main.zoomTo(1.1, 1000);
        
        // Cycle 1: Zoom out (2-5s)
        this.time.delayedCall(2000, () => {
            this.cameras.main.zoomTo(1.0, 1500);
        });
        
        // Cycle 2: Zoom in (5-8s)
        this.time.delayedCall(5000, () => {
            this.cameras.main.zoomTo(1.1, 1500);
        });
        
        // Cycle 2: Zoom out (8-12s)
        this.time.delayedCall(8000, () => {
            this.cameras.main.zoomTo(1.0, 2000);
        });
        
        // Cycle 3: Zoom in (12-16s)
        this.time.delayedCall(12000, () => {
            this.cameras.main.zoomTo(1.1, 2000);
        });
        
        // Cycle 3: Zoom out (16-20s)
        this.time.delayedCall(16000, () => {
            this.cameras.main.zoomTo(1.0, 2000);
        });
        
        // Cycle 4: Quick zoom in (20-22s)
        this.time.delayedCall(20000, () => {
            this.cameras.main.zoomTo(1.1, 1000);
        });
        
        // Cycle 4: Final zoom out (22-25s)
        this.time.delayedCall(22000, () => {
            this.cameras.main.zoomTo(1.0, 1500);
        });
        
        // End drunk effect after 25 seconds
        this.drunkEffectTimer = this.time.delayedCall(25000, () => {
            console.log('Drunk effect wearing off...');
            
            // End rainbow effect if active
            if (this.rainbowEffectActive) {
                this.endRainbowEffect();
            }
            
            window.isDrunk = false;
            this.drunkEffectTimer = null;
        });
    }
    
    showJointPrompt() {
        this.jointPromptOpen = true;
        this.player.setVelocity(0);
        
        // Create menu box (same style as soju)
        const boxWidth = Math.min(320, this.cameras.main.width - 80);
        const boxHeight = 160;
        const boxX = this.cameras.main.centerX;
        const boxY = this.cameras.main.centerY;
        
        // Create menu graphics
        const graphics = this.add.graphics();
        graphics.setScrollFactor(0);
        graphics.setDepth(999);
        
        // Shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(boxX - boxWidth/2 + 3, boxY - boxHeight/2 + 3, boxWidth, boxHeight, 4);
        
        // Pink border
        graphics.fillStyle(0xf0a0c8, 1);
        graphics.fillRoundedRect(boxX - boxWidth/2, boxY - boxHeight/2, boxWidth, boxHeight, 4);
        
        // Cream background
        graphics.fillStyle(0xfff8f0, 1);
        graphics.fillRoundedRect(boxX - boxWidth/2 + 5, boxY - boxHeight/2 + 5, boxWidth - 10, boxHeight - 10, 3);
        
        // Corner accents
        const accentColor = 0xe891b8;
        const cornerOffset = 12;
        graphics.fillStyle(accentColor, 1);
        graphics.fillCircle(boxX - boxWidth/2 + cornerOffset, boxY - boxHeight/2 + cornerOffset, 3);
        graphics.fillCircle(boxX + boxWidth/2 - cornerOffset, boxY - boxHeight/2 + cornerOffset, 3);
        graphics.fillCircle(boxX - boxWidth/2 + cornerOffset, boxY + boxHeight/2 - cornerOffset, 3);
        graphics.fillCircle(boxX + boxWidth/2 - cornerOffset, boxY + boxHeight/2 - cornerOffset, 3);
        
        this.jointPromptBox = graphics;
        
        // Title/Question
        const titleText = this.add.text(boxX, boxY - boxHeight/2 + 35, 'A joint! Take a hit?', {
            fontSize: '17px',
            fontFamily: 'Arial, sans-serif',
            color: '#000000',
            fontStyle: 'bold'
        });
        titleText.setOrigin(0.5);
        titleText.setScrollFactor(0);
        titleText.setDepth(1000);
        this.jointPromptTitle = titleText;
        
        // Yes option
        this.jointYesText = this.add.text(boxX, boxY - 10, 'Yes', {
            fontSize: '17px',
            fontFamily: 'Arial, sans-serif',
            color: '#e891b8', // Pink for selected
            fontStyle: 'bold'
        });
        this.jointYesText.setOrigin(0.5);
        this.jointYesText.setScrollFactor(0);
        this.jointYesText.setDepth(1000);
        
        // No option
        this.jointNoText = this.add.text(boxX, boxY + 20, 'No', {
            fontSize: '17px',
            fontFamily: 'Arial, sans-serif',
            color: '#000000', // Black for unselected
            fontStyle: 'normal'
        });
        this.jointNoText.setOrigin(0.5);
        this.jointNoText.setScrollFactor(0);
        this.jointNoText.setDepth(1000);
        
        // Instructions
        const instructText = this.add.text(boxX, boxY + boxHeight/2 - 20, 
            '↑↓ to select • A to confirm • B to cancel', {
            fontSize: '11px',
            fontFamily: 'Arial, sans-serif',
            color: '#666666'
        });
        instructText.setOrigin(0.5);
        instructText.setScrollFactor(0);
        instructText.setDepth(1000);
        this.jointInstructText = instructText;
        
        // Selection state
        this.jointSelection = 'yes'; // Default to yes
        
        const touchControls = window.touchControls || {};
        this.lastJointA = touchControls.a || false;
        this.lastJointB = touchControls.b || false;
        this.lastJointUp = touchControls.up || false;
        this.lastJointDown = touchControls.down || false;
        
        // Handle selection
        const handleSelection = () => {
            const upPressed = this.cursors.up.isDown || (touchControls.up && !this.lastJointUp);
            const downPressed = this.cursors.down.isDown || (touchControls.down && !this.lastJointDown);
            const aPressed = Phaser.Input.Keyboard.JustDown(this.actionKey) || (touchControls.a && !this.lastJointA);
            const bPressed = (touchControls.b && !this.lastJointB);
            
            // Change selection with up/down
            if (upPressed && this.jointSelection === 'no') {
                this.buttonSound.play();
                this.jointSelection = 'yes';
                // Pink for selected, black for unselected
                this.jointYesText.setStyle({ color: '#e891b8', fontStyle: 'bold' });
                this.jointNoText.setStyle({ color: '#000000', fontStyle: 'normal' });
            } else if (downPressed && this.jointSelection === 'yes') {
                this.buttonSound.play();
                this.jointSelection = 'no';
                this.jointYesText.setStyle({ color: '#000000', fontStyle: 'normal' });
                this.jointNoText.setStyle({ color: '#e891b8', fontStyle: 'bold' });
            }
            
            // Confirm selection with A or B (B = cancel/no)
            if (aPressed || bPressed) {
                this.buttonSound.play();
                
                // Clean up prompt
                if (this.jointPromptBox && this.jointPromptBox.scene) {
                    this.jointPromptBox.destroy();
                }
                if (this.jointPromptTitle && this.jointPromptTitle.scene) {
                    this.jointPromptTitle.destroy();
                }
                if (this.jointYesText && this.jointYesText.scene) {
                    this.jointYesText.destroy();
                }
                if (this.jointNoText && this.jointNoText.scene) {
                    this.jointNoText.destroy();
                }
                if (this.jointInstructText && this.jointInstructText.scene) {
                    this.jointInstructText.destroy();
                }
                
                this.jointPromptOpen = false;
                this.events.off('update', handleSelection);
                
                // If B pressed or selection is 'no', just close
                // If A pressed and selection is 'yes', smoke!
                if (aPressed && this.jointSelection === 'yes') {
                    this.smokeJoint();
                }
            }
            
            this.lastJointA = touchControls.a || false;
            this.lastJointB = touchControls.b || false;
            this.lastJointUp = touchControls.up || false;
            this.lastJointDown = touchControls.down || false;
        };
        
        this.events.on('update', handleSelection);
    }
    
    smokeJoint() {
        console.log('Smoking joint! 🌿');
        
        // Store original speed globally and mark that we're high
        if (!window.originalSpeed) {
            window.originalSpeed = currentSpeed;
        }
        window.isHigh = true;
        
        // Check if also drunk - CROSSFADED!
        if (window.isDrunk) {
            console.log('CROSSFADED! Starting rainbow effect!');
            this.startRainbowEffect();
        }
        
        // Slow down movement to 25%
        currentSpeed = window.originalSpeed * 0.25;
        console.log('Speed slowed to:', currentSpeed);
        
        // Save CD state if playing
        if (window.currentCD && window.MusicManager.isPlaying() && window.MusicManager.getCurrentType() === 'cd') {
            window.pausedCD = window.currentCD;
            window.pausedTrackIndex = window.currentTrackIndex;
            console.log('Saved CD state for after high');
        }
        
        // Play weed song using MusicManager (stops any other music)
        this.weedSong = this.sound.add('weedSong', { volume: 0.3 });
        window.MusicManager.play(this.weedSong, 'weed');
        
        // Create green overlay
        this.greenOverlay = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width * 2,
            this.cameras.main.height * 2,
            0x00ff00,
            0.15
        );
        this.greenOverlay.setScrollFactor(0);
        this.greenOverlay.setDepth(998);
        
        // Quick camera wobble (rotate back and forth quickly)
        let wobbleDirection = 1;
        this.wobbleInterval = this.time.addEvent({
            delay: 500, // Every 0.5 seconds
            repeat: 109, // 55 seconds total (110 wobbles)
            callback: () => {
                wobbleDirection *= -1;
                // Use setAngle for immediate rotation (not rotateTo which is a tween)
                this.cameras.main.setAngle(wobbleDirection * 4);
            }
        });
        
        // End effects after 55 seconds
        this.highEffectTimer = this.time.delayedCall(55000, () => {
            this.endHighEffect();
        });
    }
    
    endHighEffect() {
        console.log('High effect wearing off...');
        
        // End rainbow effect if active
        if (this.rainbowEffectActive) {
            this.endRainbowEffect();
        }
        
        // Restore speed
        if (window.originalSpeed) {
            currentSpeed = window.originalSpeed;
            console.log('Speed restored to:', currentSpeed);
        }
        window.isHigh = false;
        
        // Stop weed song
        if (this.weedSong && this.weedSong.isPlaying) {
            this.weedSong.stop();
            this.weedSong.destroy();
        }
        
        // Remove green overlay
        if (this.greenOverlay) {
            this.greenOverlay.destroy();
        }
        
        // Stop wobble and reset camera rotation
        if (this.wobbleInterval) {
            this.wobbleInterval.destroy();
        }
        this.cameras.main.setAngle(0);
        
        // Clear timer reference
        if (this.highEffectTimer) {
            this.highEffectTimer = null;
        }
        
        // Resume CD if there was one playing
        if (window.pausedCD) {
            console.log('Resuming CD after high');
            this.resumeCD();
        }
    }
    
    startRainbowEffect() {
        console.log('Starting rainbow lights!');
        
        // Don't start if already running
        if (this.rainbowEffectActive) return;
        
        this.rainbowEffectActive = true;
        
        // Rainbow colors
        const colors = [
            0xff0000, // Red
            0xff7f00, // Orange
            0xffff00, // Yellow
            0x00ff00, // Green
            0x0000ff, // Blue
            0x4b0082, // Indigo
            0x9400d3  // Violet
        ];
        
        let colorIndex = 0;
        
        // Create a flash overlay
        this.rainbowOverlay = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width * 2,
            this.cameras.main.height * 2,
            colors[0],
            0.25
        );
        this.rainbowOverlay.setScrollFactor(0);
        this.rainbowOverlay.setDepth(999); // Above green overlay (998)
        
        // Cycle through rainbow colors quickly
        this.rainbowInterval = this.time.addEvent({
            delay: 300, // Change color every 300ms
            callback: () => {
                colorIndex = (colorIndex + 1) % colors.length;
                if (this.rainbowOverlay) {
                    this.rainbowOverlay.setFillStyle(colors[colorIndex], 0.25);
                }
            },
            loop: true
        });
        
        // Check every second if still crossfaded
        this.rainbowCheckInterval = this.time.addEvent({
            delay: 1000,
            callback: () => {
                // Stop if no longer both high and drunk
                if (!window.isHigh || !window.isDrunk) {
                    this.endRainbowEffect();
                }
            },
            loop: true
        });
    }
    
    endRainbowEffect() {
        console.log('Ending rainbow effect');
        
        if (!this.rainbowEffectActive) return;
        
        this.rainbowEffectActive = false;
        
        // Remove overlay
        if (this.rainbowOverlay) {
            this.rainbowOverlay.destroy();
            this.rainbowOverlay = null;
        }
        
        // Stop intervals
        if (this.rainbowInterval) {
            this.rainbowInterval.destroy();
            this.rainbowInterval = null;
        }
        
        if (this.rainbowCheckInterval) {
            this.rainbowCheckInterval.destroy();
            this.rainbowCheckInterval = null;
        }
    }
    
    createTokenDisplay() {
        // Token display in upper right corner
        const padding = 10;
        const boxWidth = 120;
        const boxHeight = 40;
        
        const graphics = this.add.graphics();
        graphics.setScrollFactor(0);
        graphics.setDepth(999);
        
        // Pink border
        graphics.fillStyle(0xf0a0c8, 1);
        graphics.fillRoundedRect(
            this.cameras.main.width - boxWidth - padding,
            padding,
            boxWidth,
            boxHeight,
            4
        );
        
        // Cream background
        graphics.fillStyle(0xfff8f0, 1);
        graphics.fillRoundedRect(
            this.cameras.main.width - boxWidth - padding + 3,
            padding + 3,
            boxWidth - 6,
            boxHeight - 6,
            3
        );
        
        this.tokenDisplayBox = graphics;
        
        // Token text
        this.tokenText = this.add.text(
            this.cameras.main.width - boxWidth/2 - padding,
            padding + boxHeight/2,
            `Tokens: ${window.playerTokens}`,
            {
                fontSize: '15px',
                fontFamily: 'Arial, sans-serif',
                color: '#000000',
                fontStyle: 'bold'
            }
        );
        this.tokenText.setOrigin(0.5);
        this.tokenText.setScrollFactor(0);
        this.tokenText.setDepth(1000);
    }
    
    updateTokenDisplay() {
        if (this.tokenText) {
            this.tokenText.setText(`Tokens: ${window.playerTokens}`);
        }
    }
    
    showArcadePrompt() {
        this.arcadePromptOpen = true;
        this.player.setVelocity(0);
        
        const boxWidth = 320;
        const boxHeight = 200;
        const boxX = this.cameras.main.centerX;
        const boxY = this.cameras.main.centerY;
        
        // Create prompt graphics
        const graphics = this.add.graphics();
        graphics.setScrollFactor(0);
        graphics.setDepth(999);
        
        // Shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(boxX - boxWidth/2 + 3, boxY - boxHeight/2 + 3, boxWidth, boxHeight, 4);
        
        // Pink border
        graphics.fillStyle(0xf0a0c8, 1);
        graphics.fillRoundedRect(boxX - boxWidth/2, boxY - boxHeight/2, boxWidth, boxHeight, 4);
        
        // Cream background
        graphics.fillStyle(0xfff8f0, 1);
        graphics.fillRoundedRect(boxX - boxWidth/2 + 5, boxY - boxHeight/2 + 5, boxWidth - 10, boxHeight - 10, 3);
        
        // Corner accents
        const accentColor = 0xe891b8;
        const cornerOffset = 12;
        graphics.fillStyle(accentColor, 1);
        graphics.fillCircle(boxX - boxWidth/2 + cornerOffset, boxY - boxHeight/2 + cornerOffset, 3);
        graphics.fillCircle(boxX + boxWidth/2 - cornerOffset, boxY - boxHeight/2 + cornerOffset, 3);
        graphics.fillCircle(boxX - boxWidth/2 + cornerOffset, boxY + boxHeight/2 - cornerOffset, 3);
        graphics.fillCircle(boxX + boxWidth/2 - cornerOffset, boxY + boxHeight/2 - cornerOffset, 3);
        
        this.arcadePromptBox = graphics;
        
        // Title text
        this.arcadePromptTitle = this.add.text(boxX, boxY - boxHeight/2 + 40, 'Insert 1 token to play!', {
            fontSize: '17px',
            fontFamily: 'Arial, sans-serif',
            color: '#000000',
            fontStyle: 'bold'
        });
        this.arcadePromptTitle.setOrigin(0.5);
        this.arcadePromptTitle.setScrollFactor(0);
        this.arcadePromptTitle.setDepth(1000);
        
        // Token count display
        const hasEnoughTokens = window.playerTokens >= 1;
        const tokenColor = hasEnoughTokens ? '#000000' : '#ff0000';
        this.arcadeTokenCount = this.add.text(boxX, boxY - 20, `You have: ${window.playerTokens} tokens`, {
            fontSize: '15px',
            fontFamily: 'Arial, sans-serif',
            color: tokenColor
        });
        this.arcadeTokenCount.setOrigin(0.5);
        this.arcadeTokenCount.setScrollFactor(0);
        this.arcadeTokenCount.setDepth(1000);
        
        // Insert Coin button
        const buttonY = boxY + 30;
        const buttonWidth = 150;
        const buttonHeight = 40;
        
        // Button graphics
        const buttonGraphics = this.add.graphics();
        buttonGraphics.setScrollFactor(0);
        buttonGraphics.setDepth(1000);
        
        if (hasEnoughTokens) {
            // Pink button (active)
            buttonGraphics.fillStyle(0xe891b8, 1);
        } else {
            // Gray button (inactive)
            buttonGraphics.fillStyle(0x999999, 1);
        }
        buttonGraphics.fillRoundedRect(boxX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, 5);
        
        this.arcadeButton = buttonGraphics;
        
        // Button text
        this.arcadeButtonText = this.add.text(boxX, buttonY, 'Insert Coin!', {
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        this.arcadeButtonText.setOrigin(0.5);
        this.arcadeButtonText.setScrollFactor(0);
        this.arcadeButtonText.setDepth(1001);
        
        // Make button interactive if player has tokens
        if (hasEnoughTokens) {
            this.arcadeButton.setInteractive(
                new Phaser.Geom.Rectangle(boxX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight),
                Phaser.Geom.Rectangle.Contains
            );
            
            this.arcadeButton.on('pointerdown', () => {
                this.buttonSound.play();
                this.startSnakeGame();
            });
        }
        
        // Instructions
        const instructY = boxY + boxHeight/2 - 20;
        this.arcadeInstructText = this.add.text(boxX, instructY, 'B to cancel', {
            fontSize: '11px',
            fontFamily: 'Arial, sans-serif',
            color: '#666666'
        });
        this.arcadeInstructText.setOrigin(0.5);
        this.arcadeInstructText.setScrollFactor(0);
        this.arcadeInstructText.setDepth(1000);
        
        // Handle B to cancel
        const touchControls = window.touchControls || {};
        this.lastArcadeA = touchControls.a || false;
        this.lastArcadeB = touchControls.b || false;
        
        const handleInput = () => {
            const aPressed = (touchControls.a && !this.lastArcadeA);
            const bPressed = (touchControls.b && !this.lastArcadeB);
            
            // A to insert coin (if has tokens)
            if (aPressed && hasEnoughTokens) {
                this.buttonSound.play();
                this.startSnakeGame();
            }
            // B to cancel
            else if (bPressed) {
                this.buttonSound.play();
                this.closeArcadePrompt();
            }
            
            this.lastArcadeA = touchControls.a || false;
            this.lastArcadeB = touchControls.b || false;
        };
        
        this.events.on('update', handleInput);
        this.arcadeHandleInput = handleInput;
    }
    
    closeArcadePrompt() {
        // Clean up arcade prompt
        if (this.arcadePromptBox) this.arcadePromptBox.destroy();
        if (this.arcadePromptTitle) this.arcadePromptTitle.destroy();
        if (this.arcadeTokenCount) this.arcadeTokenCount.destroy();
        if (this.arcadeButton) this.arcadeButton.destroy();
        if (this.arcadeButtonText) this.arcadeButtonText.destroy();
        if (this.arcadeInstructText) this.arcadeInstructText.destroy();
        
        if (this.arcadeHandleInput) {
            this.events.off('update', this.arcadeHandleInput);
        }
        
        this.arcadePromptOpen = false;
    }
    
    startSnakeGame() {
        console.log('Starting Snake game!');
        
        // Close arcade prompt
        this.closeArcadePrompt();
        
        // Deduct token
        window.playerTokens--;
        
        // Freeze game
        this.arcadeGameActive = true;
        
        // Create container div directly
        const container = document.createElement('div');
        container.id = 'arcade-container';
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 400px;
            height: 420px;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            border-radius: 12px;
            padding: 12px;
            box-shadow: 
                0 0 0 8px #8B4513,
                0 0 0 12px #654321,
                0 12px 25px rgba(0,0,0,0.5),
                inset 0 0 12px rgba(0,0,0,0.3);
            border: 3px solid #654321;
            z-index: 10000;
        `;
        
        // Title
        const title = document.createElement('div');
        title.style.cssText = `
            background: #000;
            padding: 6px;
            border-radius: 8px 8px 0 0;
            text-align: center;
            border: 2px solid #FFD700;
            box-shadow: inset 0 0 8px rgba(255,215,0,0.3);
        `;
        title.innerHTML = `<h1 style="
            margin: 0;
            color: #FFD700;
            font-family: 'Courier New', monospace;
            font-size: 20px;
            text-shadow: 0 0 8px #FFD700;
            letter-spacing: 3px;
        ">SNAKE</h1>`;
        
        // Game area
        const gameArea = document.createElement('div');
        gameArea.style.cssText = `
            width: 340px;
            height: 340px;
            background: white;
            border: 3px solid #333;
            box-shadow: 
                inset 0 0 12px rgba(0,0,0,0.2),
                0 0 12px rgba(255,215,0,0.3);
            position: relative;
        `;
        
        // Canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'snake-canvas';
        canvas.width = 340;
        canvas.height = 340;
        gameArea.appendChild(canvas);
        
        // Score display
        const scoreDiv = document.createElement('div');
        scoreDiv.style.cssText = `
            margin-top: 8px;
            text-align: center;
            color: #FFD700;
            font-family: 'Courier New', monospace;
            font-size: 16px;
            text-shadow: 0 0 5px #FFD700;
        `;
        scoreDiv.innerHTML = `
            <div id="score-display">SCORE: 0</div>
            <div style="font-size: 12px; margin-top: 3px; color: #FFA500;">
                Arrow Keys or WASD • ESC to Exit
            </div>
        `;
        
        // Assemble
        container.appendChild(title);
        container.appendChild(gameArea);
        container.appendChild(scoreDiv);
        document.body.appendChild(container);
        
        this.arcadeContainer = container;
        
        console.log('Arcade container created:', container);
        console.log('Canvas element:', document.getElementById('snake-canvas'));
        
        // Start the snake game immediately
        this.runSnakeGame();
    }
    
    runSnakeGame() {
        console.log('runSnakeGame called');
        const canvas = document.getElementById('snake-canvas');
        console.log('Canvas found:', canvas);
        
        if (!canvas) {
            console.error('Canvas not found! Checking DOM...');
            console.log('All elements with ID:', document.querySelectorAll('[id]'));
            return;
        }
        
        console.log('Getting canvas context...');
        const ctx = canvas.getContext('2d');
        console.log('Context obtained:', ctx);
        const gridSize = 20;
        const tileCount = 17; // 17x17 grid fits perfectly in 340px
        
        let snake = [{x: 8, y: 8}];
        let direction = {x: 0, y: 0};
        let food = {x: 4, y: 4};
        let score = 0;
        let gameOver = false;
        
        const randomFood = () => {
            food.x = Math.floor(Math.random() * tileCount);
            food.y = Math.floor(Math.random() * tileCount);
        };
        
        const draw = () => {
            if (gameOver) return;
            
            const offset = 0; // No offset needed for 380px (19×20)
            
            // Clear canvas
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw grid
            ctx.strokeStyle = '#f0f0f0';
            ctx.lineWidth = 1;
            for (let i = 0; i <= tileCount; i++) {
                ctx.beginPath();
                ctx.moveTo(i * gridSize, 0);
                ctx.lineTo(i * gridSize, canvas.height);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, i * gridSize);
                ctx.lineTo(canvas.width, i * gridSize);
                ctx.stroke();
            }
            
            // Move snake
            if (direction.x !== 0 || direction.y !== 0) {
                const head = {
                    x: snake[0].x + direction.x,
                    y: snake[0].y + direction.y
                };
                
                // Check wall collision
                if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
                    gameOver = true;
                    this.endSnakeGame(score);
                    return;
                }
                
                // Check self collision
                for (let segment of snake) {
                    if (segment.x === head.x && segment.y === head.y) {
                        gameOver = true;
                        this.endSnakeGame(score);
                        return;
                    }
                }
                
                snake.unshift(head);
                
                // Check food collision
                if (head.x === food.x && head.y === food.y) {
                    score++;
                    document.getElementById('score-display').textContent = 'SCORE: ' + score;
                    randomFood();
                } else {
                    snake.pop();
                }
            }
            
            // Draw snake
            snake.forEach((segment, index) => {
                // Pink gradient snake
                const gradient = ctx.createLinearGradient(
                    segment.x * gridSize + offset, segment.y * gridSize + offset,
                    (segment.x + 1) * gridSize + offset, (segment.y + 1) * gridSize + offset
                );
                gradient.addColorStop(0, '#FFB6D9');
                gradient.addColorStop(1, '#e891b8');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(
                    segment.x * gridSize + offset + 1,
                    segment.y * gridSize + offset + 1,
                    gridSize - 2,
                    gridSize - 2
                );
                
                // Add shine effect to head
                if (index === 0) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.fillRect(
                        segment.x * gridSize + offset + 2,
                        segment.y * gridSize + offset + 2,
                        gridSize / 2,
                        gridSize / 2
                    );
                }
            });
            
            // Draw food (red apple)
            const foodX = food.x * gridSize + offset;
            const foodY = food.y * gridSize + offset;
            
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(foodX + gridSize/2, foodY + gridSize/2, gridSize/2 - 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Apple shine
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.arc(foodX + gridSize/2 - 3, foodY + gridSize/2 - 3, 3, 0, Math.PI * 2);
            ctx.fill();
        };
        
        // Game loop
        const gameLoop = setInterval(() => {
            if (gameOver) {
                clearInterval(gameLoop);
            } else {
                draw();
            }
        }, 110); // 10% slower than original 100ms
        
        // Store reference to cleanup later
        this.snakeGameLoop = gameLoop;
        
        // Touch controls from the game's touch system
        const touchControls = window.touchControls || {};
        let lastUp = false;
        let lastDown = false;
        let lastLeft = false;
        let lastRight = false;
        
        const handleTouchControls = () => {
            if (gameOver) return;
            
            const upPressed = touchControls.up && !lastUp;
            const downPressed = touchControls.down && !lastDown;
            const leftPressed = touchControls.left && !lastLeft;
            const rightPressed = touchControls.right && !lastRight;
            
            if (upPressed && direction.y === 0) {
                direction = {x: 0, y: -1};
            } else if (downPressed && direction.y === 0) {
                direction = {x: 0, y: 1};
            } else if (leftPressed && direction.x === 0) {
                direction = {x: -1, y: 0};
            } else if (rightPressed && direction.x === 0) {
                direction = {x: 1, y: 0};
            }
            
            lastUp = touchControls.up || false;
            lastDown = touchControls.down || false;
            lastLeft = touchControls.left || false;
            lastRight = touchControls.right || false;
        };
        
        // Check touch controls every frame
        const touchCheckInterval = setInterval(() => {
            if (gameOver) {
                clearInterval(touchCheckInterval);
            } else {
                handleTouchControls();
            }
        }, 50);
        
        this.snakeTouchInterval = touchCheckInterval;
        
        // Keyboard controls
        const handleKey = (e) => {
            if (gameOver) return;
            
            switch(e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    if (direction.y === 0) {
                        direction = {x: 0, y: -1};
                    }
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    if (direction.y === 0) {
                        direction = {x: 0, y: 1};
                    }
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (direction.x === 0) {
                        direction = {x: -1, y: 0};
                    }
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (direction.x === 0) {
                        direction = {x: 1, y: 0};
                    }
                    e.preventDefault();
                    break;
                case 'Escape':
                    gameOver = true;
                    this.endSnakeGame(score);
                    e.preventDefault();
                    break;
            }
        };
        
        document.addEventListener('keydown', handleKey);
        this.snakeKeyHandler = handleKey;
    }
    
    endSnakeGame(score) {
        console.log('Game over! Score:', score);
        
        // Clean up
        if (this.snakeGameLoop) {
            clearInterval(this.snakeGameLoop);
        }
        if (this.snakeTouchInterval) {
            clearInterval(this.snakeTouchInterval);
        }
        if (this.snakeKeyHandler) {
            document.removeEventListener('keydown', this.snakeKeyHandler);
        }
        if (this.arcadeContainer) {
            document.body.removeChild(this.arcadeContainer);
            this.arcadeContainer = null;
        }
        
        this.arcadeGameActive = false;
        
        // Show game over message
        this.showSimpleDialogue(`Game Over! Score: ${score}`);
    }
    
    advanceDialogue() {
        this.currentDialogueIndex++;
        
        if (this.currentDialogueIndex >= this.dialogueMessages.length) {
            // End dialogue
            this.dialogueBox.destroy();
            this.dialogueText.destroy();
            this.dialogueActive = false;
        } else {
            // Show next message
            this.dialogueText.setText(this.dialogueMessages[this.currentDialogueIndex]);
        }
    }
}

// Reusable Dialogue Box Creator - DS Style
function createDialogueBox(scene, text, duration = null) {
    
    const boxY = scene.cameras.main.height - 70;
    const boxWidth = scene.cameras.main.width - 100;
    const boxHeight = 80;
    
    // Create dialogue box with Phaser graphics
    const graphics = scene.add.graphics();
    graphics.setScrollFactor(0);
    graphics.setDepth(999);
    
    // Draw shadow for depth
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillRoundedRect(
        scene.cameras.main.centerX - boxWidth/2 + 3,
        boxY - boxHeight/2 + 3,
        boxWidth,
        boxHeight,
        4
    );
    
    // Draw outer pink border (DS style)
    graphics.fillStyle(0xf0a0c8, 1);
    graphics.fillRoundedRect(
        scene.cameras.main.centerX - boxWidth/2,
        boxY - boxHeight/2,
        boxWidth,
        boxHeight,
        4
    );
    
    // Draw inner cream/white background
    graphics.fillStyle(0xfff8f0, 1);
    graphics.fillRoundedRect(
        scene.cameras.main.centerX - boxWidth/2 + 5,
        boxY - boxHeight/2 + 5,
        boxWidth - 10,
        boxHeight - 10,
        3
    );
    
    // Add decorative corner accents (pink dots)
    const accentColor = 0xe891b8;
    const cornerOffset = 12;
    
    // Top-left
    graphics.fillStyle(accentColor, 1);
    graphics.fillCircle(scene.cameras.main.centerX - boxWidth/2 + cornerOffset, boxY - boxHeight/2 + cornerOffset, 3);
    
    // Top-right
    graphics.fillCircle(scene.cameras.main.centerX + boxWidth/2 - cornerOffset, boxY - boxHeight/2 + cornerOffset, 3);
    
    // Bottom-left
    graphics.fillCircle(scene.cameras.main.centerX - boxWidth/2 + cornerOffset, boxY + boxHeight/2 - cornerOffset, 3);
    
    // Bottom-right
    graphics.fillCircle(scene.cameras.main.centerX + boxWidth/2 - cornerOffset, boxY + boxHeight/2 - cornerOffset, 3);
    
    // Add text
    const dialogueText = scene.add.text(
        scene.cameras.main.centerX,
        boxY,
        text,
        {
            fontSize: '17px',
            fontFamily: 'Arial, sans-serif',
            color: '#000000',
            fontStyle: 'bold',
            align: 'center',
            lineSpacing: 4,
            wordWrap: { width: boxWidth - 40 }
        }
    );
    dialogueText.setOrigin(0.5, 0.5);
    dialogueText.setScrollFactor(0);
    dialogueText.setDepth(1000);
    
    // Auto-destroy after duration if specified (for notifications)
    if (duration) {
        scene.time.delayedCall(duration, () => {
            graphics.destroy();
            dialogueText.destroy();
        });
    }
    
    return { box: graphics, text: dialogueText };
}

// Magnus dialogue box (burnt orange version of createDialogueBox)
function createMagnusDialogueBox(scene, text, duration = null) {
    
    const boxY = scene.cameras.main.height - 70;
    const boxWidth = scene.cameras.main.width - 100;
    const boxHeight = 80;
    
    // Create dialogue box with Phaser graphics
    const graphics = scene.add.graphics();
    graphics.setScrollFactor(0);
    graphics.setDepth(999);
    
    // Draw shadow for depth
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillRoundedRect(
        scene.cameras.main.centerX - boxWidth/2 + 3,
        boxY - boxHeight/2 + 3,
        boxWidth,
        boxHeight,
        4
    );
    
    // Draw outer burnt orange border (DS style)
    graphics.fillStyle(0xcc5500, 1); // Burnt orange
    graphics.fillRoundedRect(
        scene.cameras.main.centerX - boxWidth/2,
        boxY - boxHeight/2,
        boxWidth,
        boxHeight,
        4
    );
    
    // Draw inner cream/white background
    graphics.fillStyle(0xfff8f0, 1);
    graphics.fillRoundedRect(
        scene.cameras.main.centerX - boxWidth/2 + 5,
        boxY - boxHeight/2 + 5,
        boxWidth - 10,
        boxHeight - 10,
        3
    );
    
    // Add decorative corner accents (darker orange dots)
    const accentColor = 0xd96704; // Dark orange
    const cornerOffset = 12;
    
    // Top-left
    graphics.fillStyle(accentColor, 1);
    graphics.fillCircle(scene.cameras.main.centerX - boxWidth/2 + cornerOffset, boxY - boxHeight/2 + cornerOffset, 3);
    
    // Top-right
    graphics.fillCircle(scene.cameras.main.centerX + boxWidth/2 - cornerOffset, boxY - boxHeight/2 + cornerOffset, 3);
    
    // Bottom-left
    graphics.fillCircle(scene.cameras.main.centerX - boxWidth/2 + cornerOffset, boxY + boxHeight/2 - cornerOffset, 3);
    
    // Bottom-right
    graphics.fillCircle(scene.cameras.main.centerX + boxWidth/2 - cornerOffset, boxY + boxHeight/2 - cornerOffset, 3);
    
    // Add text
    const dialogueText = scene.add.text(
        scene.cameras.main.centerX,
        boxY,
        text,
        {
            fontSize: '17px',
            fontFamily: 'Arial, sans-serif',
            color: '#000000',
            fontStyle: 'bold',
            align: 'center',
            lineSpacing: 4,
            wordWrap: { width: boxWidth - 40 }
        }
    );
    dialogueText.setOrigin(0.5, 0.5);
    dialogueText.setScrollFactor(0);
    dialogueText.setDepth(1000);
    
    // Auto-destroy after duration if specified (for notifications)
    if (duration) {
        scene.time.delayedCall(duration, () => {
            graphics.destroy();
            dialogueText.destroy();
        });
    }
    
    return { box: graphics, text: dialogueText };
}

// Helper function to check and restore Magnus summon across scenes
function checkAndRestoreMagnus(scene) {
    if (window.magnusSummonState && window.magnusSummonState.active) {
        const elapsed = Date.now() - window.magnusSummonState.summonStartTime;
        const remaining = 20000 - elapsed; // 20 seconds total
        
        if (remaining > 0) {
            console.log('Magnus still active! Re-summoning with', (remaining/1000).toFixed(1), 'seconds remaining');
            // Summon Magnus without the greeting message
            if (typeof scene.summonMagnus === 'function') {
                scene.summonMagnus(true); // Pass true to skip greeting
                
                // Set up the remaining timer
                scene.summonTimer = scene.time.delayedCall(remaining, () => {
                    if (typeof scene.dismissMagnus === 'function') {
                        scene.dismissMagnus();
                    }
                });
            }
        } else {
            // Time expired
            window.magnusSummonState = null;
        }
    }
}

// Global Magnus summon function - can be called from any scene
window.globalSummonMagnus = function(scene, skipGreeting = false) {
    console.log(scene.scene.key + ': Summoning Magnus!');
    
    // Create animations if needed
    const FRAMES_PER_ROW = 13;
    if (!scene.anims.exists('magnus-walk-up')) {
        scene.anims.create({
            key: 'magnus-walk-up',
            frames: scene.anims.generateFrameNumbers('magnus-walk', { start: 0, end: 8 }),
            frameRate: 10,
            repeat: -1
        });
        scene.anims.create({
            key: 'magnus-walk-left',
            frames: scene.anims.generateFrameNumbers('magnus-walk', { start: 13, end: 21 }),
            frameRate: 10,
            repeat: -1
        });
        scene.anims.create({
            key: 'magnus-walk-down',
            frames: scene.anims.generateFrameNumbers('magnus-walk', { start: 26, end: 34 }),
            frameRate: 10,
            repeat: -1
        });
        scene.anims.create({
            key: 'magnus-walk-right',
            frames: scene.anims.generateFrameNumbers('magnus-walk', { start: 39, end: 47 }),
            frameRate: 10,
            repeat: -1
        });
        scene.anims.create({
            key: 'magnus-idle-up',
            frames: [{ key: 'magnus-idle', frame: 0 }],
            frameRate: 1
        });
        scene.anims.create({
            key: 'magnus-idle-left',
            frames: [{ key: 'magnus-idle', frame: 13 }],
            frameRate: 1
        });
        scene.anims.create({
            key: 'magnus-idle-down',
            frames: [{ key: 'magnus-idle', frame: 26 }],
            frameRate: 1
        });
        scene.anims.create({
            key: 'magnus-idle-right',
            frames: [{ key: 'magnus-idle', frame: 39 }],
            frameRate: 1
        });
    }
    
    const spawnX = scene.player.x;
    const spawnY = scene.player.y + 60;
    
    scene.summonedNPC = scene.physics.add.sprite(spawnX, spawnY, 'magnus-idle');
    scene.summonedNPC.setScale(1.25);
    scene.summonedNPC.body.setSize(20, 64);
    scene.summonedNPC.body.setOffset(22, 16);
    scene.summonedNPC.setDepth(9);
    scene.summonedNPC.anims.play('magnus-idle-down', true);
    scene.summonedNPC.lastDirection = 'down';
    
    scene.physics.add.collider(scene.player, scene.summonedNPC);
    
    scene.magnusZone = scene.add.zone(spawnX, spawnY, 96, 96);
    scene.magnusZone.setOrigin(0.5, 0.5);
    scene.physics.add.existing(scene.magnusZone, true);
    scene.nearMagnus = false;
    scene.wasNearMagnus = false;
    
    scene.lastRecordedPlayerPosition = { x: scene.player.x, y: scene.player.y };
    scene.magnusTargetPosition = { x: spawnX, y: spawnY };
    
    scene.summonedNPC.followPlayer = true;
    
    window.magnusSummonState = {
        active: true,
        timeRemaining: 20000,
        summonStartTime: Date.now()
    };
    
    if (!skipGreeting) {
        const greetingDialogue = createMagnusDialogueBox(scene, "Hey babe! I'm here to help!");
        
        // Wait for button press to close
        const touchControls = window.touchControls || {};
        scene.lastMagnusGreetingA = touchControls.a || false;
        
        const closeGreeting = () => {
            const aPressed = (touchControls.a && !scene.lastMagnusGreetingA) || 
                             Phaser.Input.Keyboard.JustDown(scene.actionKey);
            
            if (aPressed) {
                if (scene.buttonSound) scene.buttonSound.play();
                
                if (greetingDialogue.box && greetingDialogue.box.scene) {
                    greetingDialogue.box.destroy();
                }
                if (greetingDialogue.text && greetingDialogue.text.scene) {
                    greetingDialogue.text.destroy();
                }
                
                scene.events.off('update', closeGreeting);
            }
            
            scene.lastMagnusGreetingA = touchControls.a || false;
        };
        
        scene.events.on('update', closeGreeting);
    }
    
    scene.summonTimer = scene.time.delayedCall(20000, () => {
        if (typeof scene.dismissMagnus === 'function') {
            scene.dismissMagnus();
        }
    });
};

// Global Magnus dismiss function
window.globalDismissMagnus = function(scene) {
    if (!scene.summonedNPC) return;
    
    window.magnusSummonState = null;
    
    const dialogue = createMagnusDialogueBox(scene, 'Bye babe!');
    
    // Wait for button press to close and then fade out Magnus
    const touchControls = window.touchControls || {};
    scene.lastMagnusFarewellA = touchControls.a || false;
    
    const closeFarewell = () => {
        const aPressed = (touchControls.a && !scene.lastMagnusFarewellA) || 
                         Phaser.Input.Keyboard.JustDown(scene.actionKey);
        
        if (aPressed) {
            if (scene.buttonSound) scene.buttonSound.play();
            
            if (dialogue.box && dialogue.box.scene) {
                dialogue.box.destroy();
            }
            if (dialogue.text && dialogue.text.scene) {
                dialogue.text.destroy();
            }
            
            scene.events.off('update', closeFarewell);
            
            // Fade out Magnus
            scene.tweens.add({
                targets: scene.summonedNPC,
                alpha: 0,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => {
                    if (scene.summonedNPC) {
                        scene.summonedNPC.destroy();
                        scene.summonedNPC = null;
                    }
                    if (scene.magnusZone) {
                        scene.magnusZone.destroy();
                        scene.magnusZone = null;
                    }
                }
            });
        }
        
        scene.lastMagnusFarewellA = touchControls.a || false;
    };
    
    scene.events.on('update', closeFarewell);
};

// Global Magnus AI update - call from any scene's update
window.updateMagnusAI = function(scene) {
    if (scene.summonedNPC && scene.summonedNPC.followPlayer && scene.magnusTargetPosition) {
        const dx = scene.magnusTargetPosition.x - scene.summonedNPC.x;
        const dy = scene.magnusTargetPosition.y - scene.summonedNPC.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const magnusSpeed = 160;
        
        if (distance < 18) {
            scene.summonedNPC.body.setVelocity(0, 0);
            const idleAnim = 'magnus-idle-' + (scene.summonedNPC.lastDirection || 'down');
            if (scene.summonedNPC.anims.currentAnim?.key !== idleAnim) {
                scene.summonedNPC.anims.play(idleAnim, true);
            }
        } else {
            const isMovingHorizontal = scene.summonedNPC.body.velocity.x !== 0;
            const isMovingVertical = scene.summonedNPC.body.velocity.y !== 0;
            const horizontalNeedsWork = Math.abs(dx) > 5;
            const verticalNeedsWork = Math.abs(dy) > 5;
            
            let chooseHorizontal;
            if (isMovingHorizontal && horizontalNeedsWork) {
                chooseHorizontal = true;
            } else if (isMovingVertical && verticalNeedsWork) {
                chooseHorizontal = false;
            } else {
                chooseHorizontal = Math.abs(dx) > Math.abs(dy);
            }
            
            if (chooseHorizontal) {
                if (dx > 0) {
                    scene.summonedNPC.body.setVelocity(magnusSpeed, 0);
                    scene.summonedNPC.anims.play('magnus-walk-right', true);
                    scene.summonedNPC.lastDirection = 'right';
                } else {
                    scene.summonedNPC.body.setVelocity(-magnusSpeed, 0);
                    scene.summonedNPC.anims.play('magnus-walk-left', true);
                    scene.summonedNPC.lastDirection = 'left';
                }
            } else {
                if (dy > 0) {
                    scene.summonedNPC.body.setVelocity(0, magnusSpeed);
                    scene.summonedNPC.anims.play('magnus-walk-down', true);
                    scene.summonedNPC.lastDirection = 'down';
                } else {
                    scene.summonedNPC.body.setVelocity(0, -magnusSpeed);
                    scene.summonedNPC.anims.play('magnus-walk-up', true);
                    scene.summonedNPC.lastDirection = 'up';
                }
            }
        }
    }
};

// Global Magnus checkpoint tracking - call from any scene's update
window.updateMagnusCheckpoints = function(scene) {
    if (scene.summonedNPC && scene.summonedNPC.followPlayer) {
        if (!scene.lastRecordedPlayerPosition) {
            scene.lastRecordedPlayerPosition = { 
                x: scene.player.x, 
                y: scene.player.y 
            };
            scene.magnusTargetPosition = { 
                x: scene.player.x, 
                y: scene.player.y 
            };
        }
        
        const dx = scene.player.x - scene.lastRecordedPlayerPosition.x;
        const dy = scene.player.y - scene.lastRecordedPlayerPosition.y;
        const distanceMoved = Math.sqrt(dx * dx + dy * dy);
        
        if (distanceMoved >= 25) {
            scene.magnusTargetPosition = {
                x: scene.lastRecordedPlayerPosition.x,
                y: scene.lastRecordedPlayerPosition.y
            };
            
            scene.lastRecordedPlayerPosition = {
                x: scene.player.x,
                y: scene.player.y
            };
        }
    }
    
    // Update Magnus zone
    if (scene.magnusZone && scene.summonedNPC) {
        scene.magnusZone.x = scene.summonedNPC.x;
        scene.magnusZone.y = scene.summonedNPC.y;
        scene.magnusZone.body.updateFromGameObject();
        scene.nearMagnus = scene.physics.overlap(scene.player, scene.magnusZone);
    }
};

// Bedroom Scene
class BedroomScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BedroomScene' });
    }

    preload() {
        console.log('Loading bedroom assets...');
        
        // Load all bedroom tilesets
        this.load.image('art', 'tilesets/art.png');
        this.load.image('basement', 'tilesets/basement.png');
        this.load.image('bathroom', 'tilesets/bathroom.png');
        this.load.image('bedroom', 'tilesets/bedroom.png');
        this.load.image('christmas', 'tilesets/christmas.png');
        this.load.image('classroom', 'tilesets/classroom.png');
        this.load.image('floors', 'tilesets/floors.png');
        this.load.image('generic', 'tilesets/generic.png');
        this.load.image('grocery', 'tilesets/grocery.png');
        this.load.image('gym', 'tilesets/gym.png');
        this.load.image('halloween', 'tilesets/halloween.png');
        this.load.image('japan', 'tilesets/japan.png');
        this.load.image('living_room', 'tilesets/living_room.png');
        this.load.image('museum', 'tilesets/museum.png');
        this.load.image('room_builder', 'tilesets/room_builder.png');
        
        // Load bedroom map
        this.load.tilemapTiledJSON('bedroom', 'maps/dacia_bedroom.json');
        
        // Load character animation spritesheets based on current outfit
        const outfitFolder = window.currentOutfit === 'witch' ? 'dacia_witch' : 'dacia_comfy';
        console.log('Loading sprites from:', outfitFolder);
        
        this.load.spritesheet('dacia-walk', `characters/${outfitFolder}/walk.png`, {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('dacia-idle', `characters/${outfitFolder}/idle.png`, {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('dacia-run', `characters/${outfitFolder}/run.png`, {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('dacia-jump', `characters/${outfitFolder}/jump.png`, {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('dacia-sit', `characters/${outfitFolder}/sit.png`, {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('dacia-emote', `characters/${outfitFolder}/emote.png`, {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('dacia-hurt', `characters/${outfitFolder}/hurt.png`, {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('dacia-spellcast', `characters/${outfitFolder}/spellcast.png`, {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('dacia-slash', `characters/${outfitFolder}/slash.png`, {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('dacia-shoot', `characters/${outfitFolder}/shoot.png`, {
            frameWidth: 64,
            frameHeight: 64
        });
        
        // Load Magnus NPC sprites
        this.load.spritesheet('magnus-walk', 'characters/magnus_standard/walk.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('magnus-idle', 'characters/magnus_standard/idle.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('magnus-run', 'characters/magnus_standard/run.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        
        // Load sounds
        this.load.audio('buttonPress', 'sounds/button_press.mp3');
        this.load.audio('doorSound', 'sounds/door_sound.mp3');
        
        // Load note text
        this.load.text('note1', 'notes/update_1.txt');
        
        // Load UI dialogue box
        this.load.image('dialogueBox', 'ui/dialogue_box.png');
    }

    create() {
        console.log('Creating bedroom...');
        
        const map = this.make.tilemap({ key: 'bedroom' });
        this.map = map; // Store map reference for CD pickup
        
        // Set physics world bounds to match the MAP size, not canvas
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        
        // Add all tilesets
        const allTilesets = [
            map.addTilesetImage('art', 'art'),
            map.addTilesetImage('basement', 'basement'),
            map.addTilesetImage('bathroom', 'bathroom'),
            map.addTilesetImage('bedroom', 'bedroom'),
            map.addTilesetImage('christmas', 'christmas'),
            map.addTilesetImage('classroom', 'classroom'),
            map.addTilesetImage('floors', 'floors'),
            map.addTilesetImage('generic', 'generic'),
            map.addTilesetImage('grocery', 'grocery'),
            map.addTilesetImage('gym', 'gym'),
            map.addTilesetImage('halloween', 'halloween'),
            map.addTilesetImage('japan', 'japan'),
            map.addTilesetImage('living_room', 'living_room'),
            map.addTilesetImage('museum', 'museum'),
            map.addTilesetImage('room_builder', 'room_builder')
        ];
        
        // Create layers explicitly
        const floorLayer = map.createLayer('floor', allTilesets, 0, 0);
        const shadowsLayer = map.createLayer('shadows', allTilesets, 0, 0);
        const wallsLayer = map.createLayer('walls', allTilesets, 0, 0);
        const touchesLayer = map.createLayer('touches', allTilesets, 0, 0);
        const onFloorLayer = map.createLayer('on_floor', allTilesets, 0, 0);
        const onRugsLayer = map.createLayer('on_rugs', allTilesets, 0, 0);
        const deskLayer = map.createLayer('desk', allTilesets, 0, 0);
        const onTablesLayer = map.createLayer('on_tables', allTilesets, 0, 0);
        const onWallsLayer = map.createLayer('on_walls', allTilesets, 0, 0);
        const topLayer = map.createLayer('top', allTilesets, 0, 0);
        const toDaciaLayer = map.createLayer('to_dacia', allTilesets, 0, 0); // CD layer
        const laundryLayer = map.createLayer('laundry', allTilesets, 0, 0); // Laundry layer
        const collisionLayer = map.createLayer('collision', allTilesets, 0, 0);
        
        // Hide to_dacia layer if already collected
        if (toDaciaLayer && window.cdLibrary && window.cdLibrary.to_dacia.collected) {
            toDaciaLayer.setVisible(false);
        }
        
        // Hide laundry layer if already picked up OR washed (doesn't exist)
        if (laundryLayer && (window.laundryPickedUp || !window.laundryExists)) {
            laundryLayer.setVisible(false);
        }
        
        // Store reference to laundry layer
        this.laundryLayer = laundryLayer;
        
        // Hide and set collision (note: lowercase 'collision' now)
        if (collisionLayer) {
            collisionLayer.setVisible(false);
            collisionLayer.setCollisionByExclusion([-1]);
            this.collisionLayer = collisionLayer;
        }
        
        // Get spawn position (from save or default)
        const objectLayer = map.getObjectLayer('objects');
        const spawn = window.getSpawnPosition('BedroomScene', objectLayer, 200, 200, this.scene.settings.data);
        
        // Create player
        this.player = this.physics.add.sprite(spawn.x, spawn.y, 'dacia-idle');
        this.player.setCollideWorldBounds(true);
        this.player.setSize(20, 20);
        this.player.setOffset(22, 44);
        this.player.setDepth(10); // Set explicit depth so followers can render behind
        
        // Set up collision
        if (this.collisionLayer) {
            this.physics.add.collider(this.player, this.collisionLayer);
        }
        
        // Add collision objects
        const collisionObjectsLayer = map.getObjectLayer('collision_objects');
        if (collisionObjectsLayer) {
            this.binCollisionObjects = []; // Store bin collisions for later removal

            collisionObjectsLayer.objects.forEach(obj => {
                // Skip bin collision if laundry doesn't exist (washed or picked up)
                if (obj.name === 'bin' && !window.laundryExists) {
                    console.log('Skipping bin collision - laundry does not exist');
                    return;
                }
                
                const collisionRect = this.add.rectangle(obj.x, obj.y, obj.width, obj.height);
                collisionRect.setOrigin(0, 0);
                this.physics.add.existing(collisionRect, true);
                this.physics.add.collider(this.player, collisionRect);
                
                // Store bin collisions for later removal when laundry picked up
                if (obj.name === 'bin') {
                    this.binCollisionObjects.push(collisionRect);
                }
            });
        }
        
        // Camera
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        
        // Set up sounds
        this.buttonSound = this.sound.add('buttonPress', { volume: 0.5 });
        this.doorSound = this.sound.add('doorSound', { volume: 0.6 });
        
        // Create animations (BedroomScene is now first, so we need to create them here)
        createAnimations(this);
        
        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.actionKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // Set up door back to apartment - auto trigger
        if (objectLayer) {
            const door = objectLayer.objects.find(obj => obj.name === 'door_to_apartment');
            if (door) {
                this.doorZone = this.add.zone(door.x, door.y, door.width || 32, door.height || 32);
                this.doorZone.setOrigin(0, 0);
                this.physics.add.existing(this.doorZone, true);
                
                this.doorTriggered = false;
                
                this.physics.add.overlap(this.player, this.doorZone, () => {
                    if (!this.doorTriggered) {
                        this.doorTriggered = true;
                        this.doorSound.play();
                        this.time.delayedCall(200, () => {
                            this.scene.start('ApartmentScene', { from: 'BedroomScene' });
                        });
                    }
                }, null, this);
            }
            
            // Set up note interaction - requires SPACE
            const note = objectLayer.objects.find(obj => obj.name === 'table_note');
            if (note) {
                this.noteZone = this.add.zone(note.x, note.y, note.width || 32, note.height || 32);
                this.noteZone.setOrigin(0, 0);
                this.physics.add.existing(this.noteZone, true);
                
                this.nearNote = false;
                
                this.physics.add.overlap(this.player, this.noteZone, () => {
                    this.nearNote = true;
                }, null, this);
            }
            
            // Set up kitty interaction
            const kitty = objectLayer.objects.find(obj => obj.name === 'kitty');
            if (kitty) {
                this.kittyZone = this.add.zone(kitty.x, kitty.y, kitty.width || 64, kitty.height || 64);
                this.kittyZone.setOrigin(0, 0);
                this.physics.add.existing(this.kittyZone, true);
                
                this.nearKitty = false;
                this.kittyDialogueOpen = false;
                
                this.physics.add.overlap(this.player, this.kittyZone, () => {
                    this.nearKitty = true;
                }, null, this);
            }
        }
        
        // Set up CD and Radio interactions
        this.setupCDsAndRadio(map);
        
        // Set up Wardrobe and Laundry interactions
        this.setupWardrobeAndLaundry(map);
        
        // Set up Spellbook and Spellzone interactions
        this.setupSpellbookAndSpellzone(map);
        
        console.log('Bedroom created!');
        
        // Autosave when entering scene (after brief delay to ensure everything is loaded)
        this.time.delayedCall(500, () => {
            window.saveGame(this);
        });
        
        // Check if this is the first time playing (opening cinematic)
        if (!window.triggeredEvents?.openingCinematicPlayed) {
            console.log('Playing opening cinematic!');
            this.playOpeningCinematic(map);
        } else {
            // Resume CD if we were playing one and nothing is currently playing
            if (window.currentCD && !window.MusicManager.isPlaying()) {
                this.time.delayedCall(100, () => {
                    console.log('Attempting to resume CD in BedroomScene');
                    this.playNextTrack();
                });
            }
        }
    }
    
    setupCDsAndRadio(map) {
        const objectLayer = map.getObjectLayer('objects');
        if (!objectLayer) return;
        
        // Radio interaction
        const radio = objectLayer.objects.find(obj => obj.name === 'radio');
        if (radio) {
            this.radioZone = this.add.zone(radio.x, radio.y, radio.width || 32, radio.height || 32);
            this.radioZone.setOrigin(0, 0);
            this.physics.add.existing(this.radioZone, true);
            this.nearRadio = false;
            
            this.physics.add.overlap(this.player, this.radioZone, () => {
                this.nearRadio = true;
            }, null, this);
        }
        
        // CD: to_dacia (simple object for interaction zone)
        const toDaciaCD = objectLayer.objects.find(obj => obj.name === 'to_dacia_zone');
        if (toDaciaCD && !window.cdLibrary.to_dacia.collected) {
            // Create interaction zone at the object's position
            this.toDaciaCDZone = this.add.zone(
                toDaciaCD.x,
                toDaciaCD.y,
                toDaciaCD.width || 32, 
                toDaciaCD.height || 32
            );
            this.toDaciaCDZone.setOrigin(0, 0);
            this.physics.add.existing(this.toDaciaCDZone, true);
            this.nearToDaciaCD = false;
            
            this.physics.add.overlap(this.player, this.toDaciaCDZone, () => {
                this.nearToDaciaCD = true;
            }, null, this);
        }
    }
    
    setupWardrobeAndLaundry(map) {
        const objectLayer = map.getObjectLayer('objects');
        if (!objectLayer) return;
        
        // Wardrobe interaction
        const wardrobe = objectLayer.objects.find(obj => obj.name === 'wardrobe');
        if (wardrobe) {
            this.wardrobeZone = this.add.zone(wardrobe.x, wardrobe.y, wardrobe.width || 32, wardrobe.height || 32);
            this.wardrobeZone.setOrigin(0, 0);
            this.physics.add.existing(this.wardrobeZone, true);
            this.nearWardrobe = false;
        }
        
        // Laundry pickup interaction (only if laundry exists and hasn't been picked up)
        const laundry = objectLayer.objects.find(obj => obj.name === 'laundry');
        if (laundry && window.laundryExists && !window.laundryPickedUp) {
            this.laundryZone = this.add.zone(laundry.x, laundry.y, laundry.width || 32, laundry.height || 32);
            this.laundryZone.setOrigin(0, 0);
            this.physics.add.existing(this.laundryZone, true);
            this.nearLaundry = false;
        }
    }
    
    setupSpellbookAndSpellzone(map) {
        const objectLayer = map.getObjectLayer('objects');
        if (!objectLayer) return;
        
        // Spellbook interaction
        const spellbook = objectLayer.objects.find(obj => obj.name === 'spellbook');
        if (spellbook) {
            this.spellbookZone = this.add.zone(spellbook.x, spellbook.y, spellbook.width || 32, spellbook.height || 32);
            this.spellbookZone.setOrigin(0, 0);
            this.physics.add.existing(this.spellbookZone, true);
            this.nearSpellbook = false;
        }
        
        // Spellzone for casting spells
        const spellzone = objectLayer.objects.find(obj => obj.name === 'spellzone');
        if (spellzone) {
            this.spellzone = this.add.zone(spellzone.x, spellzone.y, spellzone.width || 64, spellzone.height || 64);
            this.spellzone.setOrigin(0, 0);
            this.physics.add.existing(this.spellzone, true);
            this.spellzoneActive = false;
            this.inSpellzone = false;
        }
        
        // Initialize summon state
        this.summonedNPC = null;
        this.summonTimer = null;
        
        // Pokémon-style follower tracking
        // Track the last "checkpoint" position we recorded for following
        this.lastRecordedPlayerPosition = null;
        this.magnusTargetPosition = null;
        
        // Check if Magnus should be active from previous scene
        checkAndRestoreMagnus(this);
    }
    
    playOpeningCinematic(map) {
        console.log('Starting opening cinematic...');
        
        // Disable player movement during cinematic
        this.cinematicPlaying = true;
        this.player.setVelocity(0);
        
        // Find bed and note positions
        const objectLayer = map.getObjectLayer('objects');
        if (!objectLayer) {
            console.error('No objects layer found!');
            this.endOpeningCinematic();
            return;
        }
        
        const bedSpawn = objectLayer.objects.find(obj => obj.name === 'bed_spawn');
        const note = objectLayer.objects.find(obj => obj.name === 'table_note');
        
        console.log('Found bed_spawn:', !!bedSpawn, 'Found table_note:', !!note);
        
        if (bedSpawn) {
            // Move player to bed position
            this.player.setPosition(bedSpawn.x, bedSpawn.y);
            console.log('Player moved to bed at:', bedSpawn.x, bedSpawn.y);
        }
        
        // Set player to first frame of sit animation (down-facing)
        // Sit animation is frames 26-28, so frame 26 is the first sit frame
        this.player.setTexture('dacia-sit', 26);
        
        // Create black overlay for fade in
        const blackOverlay = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width * 2,
            this.cameras.main.height * 2,
            0x000000,
            1.0
        );
        blackOverlay.setScrollFactor(0);
        blackOverlay.setDepth(1000);
        
        // Step 1: Fade in from black (2.5 seconds)
        // Start background music CD during cinematic
        window.currentCD = 'bg';
        window.currentTrackIndex = 0;
        this.playNextTrack();
        
        this.tweens.add({
            targets: blackOverlay,
            alpha: 0,
            duration: 2500,
            ease: 'Linear',
            onComplete: () => {
                blackOverlay.destroy();
                
                // Step 2: Hold on sit frame for 2 seconds
                this.time.delayedCall(2000, () => {
                    console.log('Playing sit animation');
                    this.player.anims.play('sit', false); // Play once
                    
                    // Step 3: Jump after sitting up (~500ms after sit finishes)
                    this.time.delayedCall(1000, () => {
                        console.log('Playing jump animation');
                        this.player.anims.play('jump-down', false); // Play once
                        
                        // Step 4: Show dialogue after jump completes (~500ms)
                        this.time.delayedCall(500, () => {
                            this.player.anims.play('idle-down', true);
                            
                            // Temporarily clear dialogue guard for cinematic dialogues
                            const dialogue1 = createDialogueBox(this, 'Ohhhhh the day is finally here!!');
                            
                            // Close with A press, then walk to note
                            const touchControls = window.touchControls || {};
                            let lastCinA = touchControls.a || false;
                            let canCloseCin1 = false;
                            this.time.delayedCall(300, () => { canCloseCin1 = true; });
                            
                            const closeCin1 = () => {
                                if (!canCloseCin1) {
                                    lastCinA = touchControls.a || false;
                                    return;
                                }
                                const aPressed = (touchControls.a && !lastCinA) || Phaser.Input.Keyboard.JustDown(this.actionKey);
                                if (aPressed) {
                                    if (dialogue1.box && dialogue1.box.scene) dialogue1.box.destroy();
                                    if (dialogue1.text && dialogue1.text.scene) dialogue1.text.destroy();
                                    this.events.off('update', closeCin1);
                                    
                                    // Walk right a few steps then to note
                                    console.log('Walking right from bed');
                                    this.walkRightThenToNote(note);
                                }
                                lastCinA = touchControls.a || false;
                            };
                            this.events.on('update', closeCin1);
                        });
                    });
                });
            }
        });
    }
    
    walkRightThenToNote(note) {
        console.log('Walking right from bed');
        
        const targetX = this.player.x + 70;
        let stuckFrames = 0;
        let lastX = this.player.x;
        let totalFrames = 0;
        
        this.player.setVelocityX(80);
        this.player.anims.play('walk-right', true);
        
        const checkRightWalk = () => {
            totalFrames++;
            
            if (this.player.x >= targetX || stuckFrames > 30 || totalFrames > 200) {
                this.player.setVelocity(0);
                this.events.off('update', checkRightWalk);
                console.log('Walked right, now walking to note');
                this.walkToNote(note.x, note.y);
                return;
            }
            
            if (Math.abs(this.player.x - lastX) < 0.5) {
                stuckFrames++;
            } else {
                stuckFrames = 0;
            }
            lastX = this.player.x;
        };
        
        this.events.on('update', checkRightWalk);
    }
    
    walkToNote(targetX, targetY) {
        console.log('Walking to note at:', targetX, targetY);
        
        const distance = Math.sqrt((targetX - this.player.x) ** 2 + (targetY - this.player.y) ** 2);
        
        if (distance < 10) {
            this.arriveAtNote();
            return;
        }
        
        let lastX = this.player.x;
        let lastY = this.player.y;
        let stuckFrames = 0;
        let totalFrames = 0;
        
        // Check every frame - recalculate direction to handle collisions
        const checkArrival = () => {
            totalFrames++;
            
            const currentDx = targetX - this.player.x;
            const currentDy = targetY - this.player.y;
            const currentDistance = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
            
            if (currentDistance < 20) {
                // Arrived!
                this.player.setVelocity(0);
                this.events.off('update', checkArrival);
                this.arriveAtNote();
                return;
            }
            
            // Stuck detection - if barely moved in 30 frames, skip ahead
            if (Math.abs(this.player.x - lastX) < 0.5 && Math.abs(this.player.y - lastY) < 0.5) {
                stuckFrames++;
            } else {
                stuckFrames = 0;
            }
            lastX = this.player.x;
            lastY = this.player.y;
            
            // Safety: if stuck for 30 frames or walking for 300+ frames, just arrive
            if (stuckFrames > 30 || totalFrames > 300) {
                console.log('Walk to note: unstuck/timeout, teleporting to note');
                this.player.setVelocity(0);
                this.player.setPosition(targetX, targetY);
                this.events.off('update', checkArrival);
                this.arriveAtNote();
                return;
            }
            
            // Recalculate direction each frame to navigate around obstacles
            const speed = 80;
            const vx = (currentDx / currentDistance) * speed;
            const vy = (currentDy / currentDistance) * speed;
            this.player.setVelocity(vx, vy);
            
            // Update walk animation based on current direction
            if (Math.abs(currentDx) > Math.abs(currentDy)) {
                this.player.anims.play(currentDx > 0 ? 'walk-right' : 'walk-left', true);
            } else {
                this.player.anims.play(currentDy > 0 ? 'walk-down' : 'walk-up', true);
            }
        };
        
        this.events.on('update', checkArrival);
    }
    
    arriveAtNote() {
        console.log('Arrived at note!');
        this.player.setVelocity(0);
        this.player.anims.play('idle-down', true);
        
        // Show "I think I should read this note!" dialogue - close with A
        const dialogue2 = createDialogueBox(this, 'I think I should read this note!');
        
        const touchControls = window.touchControls || {};
        let lastCinA2 = touchControls.a || false;
        let canCloseCin2 = false;
        this.time.delayedCall(300, () => { canCloseCin2 = true; });
        
        const closeCin2 = () => {
            if (!canCloseCin2) {
                lastCinA2 = touchControls.a || false;
                return;
            }
            const aPressed = (touchControls.a && !lastCinA2) || Phaser.Input.Keyboard.JustDown(this.actionKey);
            if (aPressed) {
                if (dialogue2.box && dialogue2.box.scene) dialogue2.box.destroy();
                if (dialogue2.text && dialogue2.text.scene) dialogue2.text.destroy();
                this.events.off('update', closeCin2);
                
                this.endOpeningCinematic();
            }
            lastCinA2 = touchControls.a || false;
        };
        this.events.on('update', closeCin2);
    }
    
    endOpeningCinematic() {
        console.log('Opening cinematic complete!');
        
        // Mark cinematic as played
        window.triggeredEvents.openingCinematicPlayed = true;
        
        // Re-enable player movement
        this.cinematicPlaying = false;
        
        // Autosave after cinematic
        window.saveGame(this);
    }

    update() {
        // Update Magnus follower AI FIRST - runs even during cutscenes/dialogues
        if (this.summonedNPC && this.summonedNPC.followPlayer && this.magnusTargetPosition) {
            const dx = this.magnusTargetPosition.x - this.summonedNPC.x;
            const dy = this.magnusTargetPosition.y - this.summonedNPC.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const magnusSpeed = 160; // Fixed speed for Magnus (matches player's normal speed)
            
            // If close enough to target, stop and idle
            if (distance < 18) {
                this.summonedNPC.body.setVelocity(0, 0);
                
                const idleAnim = 'magnus-idle-' + (this.summonedNPC.lastDirection || 'down');
                if (this.summonedNPC.anims.currentAnim?.key !== idleAnim) {
                    this.summonedNPC.anims.play(idleAnim, true);
                }
            } else {
                // Direction persistence to reduce jitter
                const isMovingHorizontal = this.summonedNPC.body.velocity.x !== 0;
                const isMovingVertical = this.summonedNPC.body.velocity.y !== 0;
                
                const horizontalNeedsWork = Math.abs(dx) > 5;
                const verticalNeedsWork = Math.abs(dy) > 5;
                
                let chooseHorizontal;
                
                if (isMovingHorizontal && horizontalNeedsWork) {
                    chooseHorizontal = true;
                } else if (isMovingVertical && verticalNeedsWork) {
                    chooseHorizontal = false;
                } else {
                    chooseHorizontal = Math.abs(dx) > Math.abs(dy);
                }
                
                // Move in ONE direction only
                if (chooseHorizontal) {
                    if (dx > 0) {
                        this.summonedNPC.body.setVelocity(magnusSpeed, 0);
                        this.summonedNPC.anims.play('magnus-walk-right', true);
                        this.summonedNPC.lastDirection = 'right';
                    } else {
                        this.summonedNPC.body.setVelocity(-magnusSpeed, 0);
                        this.summonedNPC.anims.play('magnus-walk-left', true);
                        this.summonedNPC.lastDirection = 'left';
                    }
                } else {
                    if (dy > 0) {
                        this.summonedNPC.body.setVelocity(0, magnusSpeed);
                        this.summonedNPC.anims.play('magnus-walk-down', true);
                        this.summonedNPC.lastDirection = 'down';
                    } else {
                        this.summonedNPC.body.setVelocity(0, -magnusSpeed);
                        this.summonedNPC.anims.play('magnus-walk-up', true);
                        this.summonedNPC.lastDirection = 'up';
                    }
                }
            }
        }
        
        // Regular update logic - can return early
        if (!this.player || this.cinematicPlaying || this.noteOpen || this.kittyDialogueOpen || this.radioMenuOpen || this.cdPickupOpen || this.simpleDialogueOpen || this.wardrobeMenuOpen || this.spellbookMenuOpen || this.castingSpell || this.magnusDialogueOpen) return;
        
        this.player.setVelocity(0);
        
        // Check keyboard OR touch controls
        const touchControls = window.touchControls || {};
        
        // Track button states BEFORE checking presses
        const lastA = this.lastAPressed || false;
        this.lastAPressed = touchControls.a || false;
        
        const leftPressed = this.cursors.left.isDown || touchControls.left;
        const rightPressed = this.cursors.right.isDown || touchControls.right;
        const upPressed = this.cursors.up.isDown || touchControls.up;
        const downPressed = this.cursors.down.isDown || touchControls.down;
        const aPressed = Phaser.Input.Keyboard.JustDown(this.actionKey) || (touchControls.a && !lastA);
        
        // Manually check overlaps every frame (more reliable than callbacks)
        if (this.kittyZone) {
            this.nearKitty = this.physics.overlap(this.player, this.kittyZone);
        }
        if (this.noteZone) {
            this.nearNote = this.physics.overlap(this.player, this.noteZone);
        }
        if (this.radioZone) {
            this.nearRadio = this.physics.overlap(this.player, this.radioZone);
        }
        if (this.toDaciaCDZone) {
            this.nearToDaciaCD = this.physics.overlap(this.player, this.toDaciaCDZone);
        }
        if (this.wardrobeZone) {
            this.nearWardrobe = this.physics.overlap(this.player, this.wardrobeZone);
        }
        if (this.laundryZone) {
            this.nearLaundry = this.physics.overlap(this.player, this.laundryZone);
        }
        if (this.spellbookZone) {
            this.nearSpellbook = this.physics.overlap(this.player, this.spellbookZone);
        }
        if (this.spellzone) {
            this.inSpellzone = this.physics.overlap(this.player, this.spellzone);
        }
        if (this.magnusZone && this.summonedNPC) {
            // Update Magnus zone position to follow Magnus
            this.magnusZone.x = this.summonedNPC.x;
            this.magnusZone.y = this.summonedNPC.y;
            // Update physics body bounds since it's a static body
            this.magnusZone.body.updateFromGameObject();
            this.nearMagnus = this.physics.overlap(this.player, this.magnusZone);
            
            // Debug: log when near Magnus
            if (this.nearMagnus && !this.wasNearMagnus) {
                console.log('Now near Magnus! Zone at:', this.magnusZone.x, this.magnusZone.y);
                this.wasNearMagnus = true;
            } else if (!this.nearMagnus && this.wasNearMagnus) {
                this.wasNearMagnus = false;
            }
        }
        
        // DEBUG: Log A button state
        if (aPressed) {
            console.log('[A Button Debug]', {
                scene: 'BedroomScene',
                aPressed: aPressed,
                'touchControls.a': touchControls.a,
                lastA: lastA,
                'space.isDown': this.cursors.space.isDown,
                'JustDown': Phaser.Input.Keyboard.JustDown(this.actionKey),
                noteOpen: this.noteOpen,
                kittyDialogueOpen: this.kittyDialogueOpen,
                radioMenuOpen: this.radioMenuOpen,
                cdPickupOpen: this.cdPickupOpen,
                simpleDialogueOpen: this.simpleDialogueOpen,
                nearKitty: this.nearKitty,
                nearNote: this.nearNote,
                nearRadio: this.nearRadio,
                nearToDaciaCD: this.nearToDaciaCD
            });
        }
        
        // Check if near kitty and A is pressed
        if (this.nearKitty && aPressed) {
            console.log('[A Button] Kitty interaction triggered!');
            this.buttonSound.play();
            this.showKittyDialogue();
        }
        // Check if near note and A is pressed
        else if (this.nearNote && aPressed) {
            console.log('[A Button] Note interaction triggered!');
            this.buttonSound.play();
            this.showNote();
        }
        // Check if near radio and A is pressed
        else if (this.nearRadio && aPressed) {
            console.log('[A Button] Radio interaction triggered!');
            this.buttonSound.play();
            this.showRadioMenu();
        }
        // Check if near to_dacia CD and A is pressed
        else if (this.nearToDaciaCD && aPressed && !window.cdLibrary.to_dacia.collected) {
            console.log('[A Button] CD pickup triggered!');
            this.buttonSound.play();
            this.pickupCD('to_dacia');
        }
        // Check if near wardrobe and A is pressed
        else if (this.nearWardrobe && aPressed) {
            console.log('[A Button] Wardrobe interaction triggered!');
            this.buttonSound.play();
            this.openWardrobe();
        }
        // Check if near laundry and A is pressed
        else if (this.nearLaundry && aPressed && !window.laundryPickedUp) {
            console.log('[A Button] Laundry pickup triggered!');
            this.buttonSound.play();
            this.pickupLaundry();
        }
        // Check if near spellbook and A is pressed
        else if (this.nearSpellbook && aPressed) {
            console.log('[A Button] Spellbook interaction triggered!');
            this.buttonSound.play();
            this.openSpellbook();
        }
        // Check if near Magnus and A is pressed
        else if (this.nearMagnus && aPressed && this.summonedNPC) {
            console.log('[A Button] Magnus interaction triggered!');
            this.buttonSound.play();
            this.showMagnusDialogue();
        }
        
        // Check if in active spellzone
        if (this.spellzoneActive && this.inSpellzone && !this.castingUIShown) {
            this.showCastingUI();
        }
        
        if (leftPressed) {
            this.player.setVelocityX(-currentSpeed);
            this.player.anims.play('walk-left', true);
            setLastDirection('left');
            window.WitchIdleManager.onMovementStart();
        } else if (rightPressed) {
            this.player.setVelocityX(currentSpeed);
            this.player.anims.play('walk-right', true);
            setLastDirection('right');
            window.WitchIdleManager.onMovementStart();
        } else if (upPressed) {
            this.player.setVelocityY(-currentSpeed);
            this.player.anims.play('walk-up', true);
            setLastDirection('up');
            window.WitchIdleManager.onMovementStart();
        } else if (downPressed) {
            this.player.setVelocityY(currentSpeed);
            this.player.anims.play('walk-down', true);
            setLastDirection('down');
            window.WitchIdleManager.onMovementStart();
        } else {
            window.WitchIdleManager.onMovementStop();
            window.playIdleAnimation(this.player, lastDirection);
        }
        
        // Pokémon-style following: Record player position checkpoints
        if (this.summonedNPC && this.summonedNPC.followPlayer) {
            // Initialize if first time
            if (!this.lastRecordedPlayerPosition) {
                this.lastRecordedPlayerPosition = { 
                    x: this.player.x, 
                    y: this.player.y 
                };
                this.magnusTargetPosition = { 
                    x: this.player.x, 
                    y: this.player.y 
                };
            }
            
            // Check if player has moved far enough to record new checkpoint
            const dx = this.player.x - this.lastRecordedPlayerPosition.x;
            const dy = this.player.y - this.lastRecordedPlayerPosition.y;
            const distanceMoved = Math.sqrt(dx * dx + dy * dy);
            
            // If player moved 25+ pixels from last checkpoint, record new position
            // (Reduced from 35 to 25 for closer following)
            if (distanceMoved >= 25) {
                console.log('New checkpoint! Player moved', distanceMoved.toFixed(1), 'pixels');
                
                // Magnus's new target is where player WAS (the old checkpoint)
                this.magnusTargetPosition = {
                    x: this.lastRecordedPlayerPosition.x,
                    y: this.lastRecordedPlayerPosition.y
                };
                
                // Update checkpoint to current player position
                this.lastRecordedPlayerPosition = {
                    x: this.player.x,
                    y: this.player.y
                };
                
                console.log('Magnus target:', this.magnusTargetPosition);
            }
        }
    }
    
    showNote() {
        this.noteOpen = true;
        this.player.setVelocity(0);
        
        // Get touch controls
        const touchControls = window.touchControls || {};
        
        // Create fullscreen overlay
        const overlay = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.9
        );
        overlay.setScrollFactor(0);
        overlay.setDepth(1000);
        
        // Create note background
        const noteWidth = Math.min(800, this.cameras.main.width - 40);
        const noteHeight = Math.min(500, this.cameras.main.height - 100);
        const noteBox = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            noteWidth,
            noteHeight,
            0xffffff
        );
        noteBox.setScrollFactor(0);
        noteBox.setDepth(1001);
        
        // Load and display note text
        const noteText = this.cache.text.get('note1');
        const text = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            noteText,
            {
                fontSize: '15px',
                color: '#000000',
                align: 'center',
                wordWrap: { width: noteWidth - 50 }
            }
        );
        text.setOrigin(0.5);
        text.setScrollFactor(0);
        text.setDepth(1002);
        
        // Close instruction
        const closeText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY + noteHeight / 2 - 30,
            'Press A to close',
            {
                fontSize: '13px',
                color: '#666666'
            }
        );
        closeText.setOrigin(0.5);
        closeText.setScrollFactor(0);
        closeText.setDepth(1002);
        
        // Wait a frame before enabling close to prevent immediate close from the same A press
        this.time.delayedCall(100, () => {
            this.canCloseNote = true;
        });
        
        // Track last A state
        this.lastNoteAState = touchControls.a || false;
        
        // Close on A button press (detect press, not hold)
        const closeNote = () => {
            if (!this.canCloseNote) {
                this.lastNoteAState = touchControls.a || false;
                return;
            }
            
            const aJustPressed = (touchControls.a && !this.lastNoteAState);
            const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aJustPressed || spaceJustPressed) {
                this.buttonSound.play();
                overlay.destroy();
                noteBox.destroy();
                text.destroy();
                closeText.destroy();
                this.noteOpen = false;
                this.canCloseNote = false;
                this.events.off('update', closeNote);
            }
            
            this.lastNoteAState = touchControls.a || false;
        };
        
        this.events.on('update', closeNote);
    }
    
    showKittyDialogue() {
        console.log('showKittyDialogue called!');
        this.kittyDialogueOpen = true;
        this.player.setVelocity(0);
        
        // Create dialogue box using reusable function
        const dialogue = createDialogueBox(this, 'Purrrrrrr....');
        console.log('Dialogue created:', dialogue);
        console.log('Dialogue.box:', dialogue.box);
        console.log('Dialogue.text:', dialogue.text);
        this.kittyDialogueBox = dialogue.box;
        this.kittyDialogueText = dialogue.text;
        
        // Wait before allowing close
        this.time.delayedCall(100, () => {
            this.canCloseKittyDialogue = true;
        });
        
        // Get touch controls
        const touchControls = window.touchControls || {};
        this.lastKittyAState = touchControls.a || false;
        this.lastKittyBState = touchControls.b || false;
        
        // Close on A or B button
        const closeKittyDialogue = () => {
            if (!this.canCloseKittyDialogue) {
                this.lastKittyAState = touchControls.a || false;
                this.lastKittyBState = touchControls.b || false;
                return;
            }
            
            const aJustPressed = (touchControls.a && !this.lastKittyAState);
            const bJustPressed = (touchControls.b && !this.lastKittyBState);
            const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aJustPressed || bJustPressed || spaceJustPressed) {
                this.buttonSound.play();
                
                // Safety check - only destroy if they exist
                if (this.kittyDialogueBox && !this.kittyDialogueBox.scene) {
                    // Object already destroyed, just clean up
                } else if (this.kittyDialogueBox) {
                    this.kittyDialogueBox.destroy();
                }
                
                if (this.kittyDialogueText && !this.kittyDialogueText.scene) {
                    // Object already destroyed, just clean up
                } else if (this.kittyDialogueText) {
                    this.kittyDialogueText.destroy();
                }
                
                this.kittyDialogueOpen = false;
                this.canCloseKittyDialogue = false;
                this.events.off('update', closeKittyDialogue);
            }
            
            this.lastKittyAState = touchControls.a || false;
            this.lastKittyBState = touchControls.b || false;
        };
        
        this.events.on('update', closeKittyDialogue);
    }
    
    showSimpleDialogue(message) {
        this.simpleDialogueOpen = true;
        this.player.setVelocity(0);
        
        const dialogue = createDialogueBox(this, message);
        this.simpleDialogueBox = dialogue.box;
        this.simpleDialogueText = dialogue.text;
        
        // Wait before allowing close
        this.time.delayedCall(50, () => {
            this.canCloseSimpleDialogue = true;
        });
        
        const touchControls = window.touchControls || {};
        this.lastSimpleA = touchControls.a || false;
        this.lastSimpleB = touchControls.b || false;
        
        // Close handler
        const closeDialogue = () => {
            if (!this.canCloseSimpleDialogue) {
                this.lastSimpleA = touchControls.a || false;
                this.lastSimpleB = touchControls.b || false;
                return;
            }
            
            const aPressed = (touchControls.a && !this.lastSimpleA);
            const bPressed = (touchControls.b && !this.lastSimpleB);
            const spacePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aPressed || bPressed || spacePressed) {
                this.buttonSound.play();
                
                if (this.simpleDialogueBox && this.simpleDialogueBox.scene) {
                    this.simpleDialogueBox.destroy();
                }
                if (this.simpleDialogueText && this.simpleDialogueText.scene) {
                    this.simpleDialogueText.destroy();
                }
                
                this.simpleDialogueOpen = false;
                this.events.off('update', closeDialogue);
            }
            
            this.lastSimpleA = touchControls.a || false;
            this.lastSimpleB = touchControls.b || false;
        };
        
        this.events.on('update', closeDialogue);
    }
    
    
    openWardrobe() {
        // Check if laundry exists anywhere (on floor or picked up)
        if (window.laundryExists) {
            const dialogue = createDialogueBox(this, "Looks like you've got some laundry to do first.");
            this.wardrobeMenuOpen = true;
            
            const touchControls = window.touchControls || {};
            this.lastWardrobeA = touchControls.a || false;
            
            const closeDialogue = () => {
                const aPressed = (touchControls.a && !this.lastWardrobeA);
                const spacePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
                
                if (aPressed || spacePressed) {
                    this.buttonSound.play();
                    
                    if (dialogue.box && dialogue.box.scene) {
                        dialogue.box.destroy();
                    }
                    if (dialogue.text && dialogue.text.scene) {
                        dialogue.text.destroy();
                    }
                    
                    this.wardrobeMenuOpen = false;
                    this.events.off('update', closeDialogue);
                }
                
                this.lastWardrobeA = touchControls.a || false;
            };
            
            this.events.on('update', closeDialogue);
            return;
        }
        
        // Open wardrobe outfit selection menu
        this.wardrobeMenuOpen = true;
        this.player.setVelocity(0);
        
        const outfits = [
            { key: 'comfy', name: 'Comfy Outfit' },
            { key: 'witch', name: 'Witch Outfit' }
        ];
        
        this.wardrobeSelectedIndex = outfits.findIndex(o => o.key === window.currentOutfit);
        
        // Create larger menu box
        const boxWidth = Math.min(400, this.cameras.main.width - 60);
        const boxHeight = Math.min(300, this.cameras.main.height - 100);
        const boxX = this.cameras.main.centerX;
        const boxY = this.cameras.main.centerY;
        
        // Create menu graphics
        const graphics = this.add.graphics();
        graphics.setScrollFactor(0);
        graphics.setDepth(999);
        
        // Shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(boxX - boxWidth/2 + 3, boxY - boxHeight/2 + 3, boxWidth, boxHeight, 4);
        
        // Darker purple border
        graphics.fillStyle(0x6b4c9a, 1);
        graphics.fillRoundedRect(boxX - boxWidth/2, boxY - boxHeight/2, boxWidth, boxHeight, 4);
        
        // Lavender background
        graphics.fillStyle(0xc8b4e6, 1);
        graphics.fillRoundedRect(boxX - boxWidth/2 + 4, boxY - boxHeight/2 + 4, boxWidth - 8, boxHeight - 8, 2);
        
        this.wardrobeMenuGraphics = graphics;
        
        // Title
        const title = this.add.text(boxX, boxY - boxHeight/2 + 30, '✨ Wardrobe ✨', {
            fontFamily: 'Georgia, serif',
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        title.setOrigin(0.5);
        title.setScrollFactor(0);
        title.setDepth(1000);
        this.wardrobeMenuTitle = title;
        
        // Create outfit items
        this.wardrobeMenuItems = [];
        const startY = boxY - boxHeight/2 + 80;
        const itemSpacing = 50;
        
        outfits.forEach((outfit, index) => {
            const itemY = startY + (index * itemSpacing);
            
            // Highlight box (only for selected item)
            const highlight = this.add.graphics();
            highlight.setScrollFactor(0);
            highlight.setDepth(999);
            
            if (index === this.wardrobeSelectedIndex) {
                // Gold/yellow highlight
                highlight.fillStyle(0xffd700, 1);
                highlight.fillRoundedRect(boxX - boxWidth/2 + 20, itemY - 20, boxWidth - 40, 40, 4);
            }
            
            // Outfit name text
            const text = this.add.text(boxX, itemY, outfit.name, {
                fontFamily: 'Georgia, serif',
                fontSize: '20px',
                color: '#ffffff'
            });
            text.setOrigin(0.5);
            text.setScrollFactor(0);
            text.setDepth(1000);
            
            this.wardrobeMenuItems.push({ outfit, text, highlight });
        });
        
        // Instructions
        const instructions = this.add.text(boxX, boxY + boxHeight/2 - 30, 'UP/DOWN: Select  •  A: Choose  •  B: Close', {
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            color: '#ffffff'
        });
        instructions.setOrigin(0.5);
        instructions.setScrollFactor(0);
        instructions.setDepth(1000);
        this.wardrobeMenuInstructions = instructions;
        
        // Handle menu navigation
        const touchControls = window.touchControls || {};
        this.lastWardrobeUp = touchControls.up || false;
        this.lastWardrobeDown = touchControls.down || false;
        this.lastWardrobeA = touchControls.a || false;
        this.lastWardrobeB = touchControls.b || false;
        
        const handleWardrobeMenu = () => {
            const upPressed = (this.cursors.up.isDown || touchControls.up) && !this.lastWardrobeUp;
            const downPressed = (this.cursors.down.isDown || touchControls.down) && !this.lastWardrobeDown;
            const aPressed = Phaser.Input.Keyboard.JustDown(this.actionKey) || (touchControls.a && !this.lastWardrobeA);
            const bPressed = Phaser.Input.Keyboard.JustDown(this.cursors.shift) || (touchControls.b && !this.lastWardrobeB);
            
            if (upPressed && this.wardrobeSelectedIndex > 0) {
                this.buttonSound.play();
                this.wardrobeSelectedIndex--;
                this.updateWardrobeHighlight();
            } else if (downPressed && this.wardrobeSelectedIndex < outfits.length - 1) {
                this.buttonSound.play();
                this.wardrobeSelectedIndex++;
                this.updateWardrobeHighlight();
            } else if (aPressed) {
                this.buttonSound.play();
                const selectedOutfit = outfits[this.wardrobeSelectedIndex];
                this.changeOutfit(selectedOutfit.key);
            } else if (bPressed) {
                this.buttonSound.play();
                this.closeWardrobeMenu();
            }
            
            this.lastWardrobeUp = this.cursors.up.isDown || touchControls.up;
            this.lastWardrobeDown = this.cursors.down.isDown || touchControls.down;
            this.lastWardrobeA = touchControls.a || false;
            this.lastWardrobeB = touchControls.b || false;
        };
        
        this.events.on('update', handleWardrobeMenu);
        this.wardrobeMenuHandler = handleWardrobeMenu;
    }
    
    updateWardrobeHighlight() {
        // Redraw all highlights
        this.wardrobeMenuItems.forEach((item, index) => {
            item.highlight.clear();
            
            if (index === this.wardrobeSelectedIndex) {
                const boxWidth = Math.min(400, this.cameras.main.width - 60);
                const boxHeight = Math.min(300, this.cameras.main.height - 100);
                const boxX = this.cameras.main.centerX;
                const boxY = this.cameras.main.centerY;
                const startY = boxY - boxHeight/2 + 80;
                const itemY = startY + (index * 50);
                
                // Gold/yellow highlight
                item.highlight.fillStyle(0xffd700, 1);
                item.highlight.fillRoundedRect(boxX - boxWidth/2 + 20, itemY - 20, boxWidth - 40, 40, 4);
            }
        });
    }
    
    changeOutfit(outfitKey) {
        console.log('🎨 Changing outfit to:', outfitKey);
        
        // Update current outfit
        window.currentOutfit = outfitKey;
        console.log('🎨 Set window.currentOutfit =', window.currentOutfit);
        
        // Save to Firebase immediately
        if (window.currentPlayer) {
            console.log('🎨 Saving outfit to Firebase for player:', window.currentPlayer);
            window.saveGame(this).then(() => {
                console.log('🎨 ✅ Outfit saved to Firebase successfully');
            }).catch(err => {
                console.error('🎨 ❌ Failed to save outfit to Firebase:', err);
            });
        } else {
            console.error('🎨 ❌ No currentPlayer set, cannot save to Firebase');
        }
        
        // Close menu
        this.closeWardrobeMenu();
        
        // Reload the page to load new sprite sheets
        const outfitName = outfitKey === 'witch' ? 'Witch' : 'Comfy';
        const dialogue = createDialogueBox(this, `Changing to ${outfitName} Outfit...`);
        
        // Reload after brief delay
        this.time.delayedCall(1000, () => {
            console.log('🎨 Reloading page to switch to new outfit...');
            window.location.reload();
        });
    }
    
    closeWardrobeMenu() {
        if (this.wardrobeMenuGraphics) this.wardrobeMenuGraphics.destroy();
        if (this.wardrobeMenuTitle) this.wardrobeMenuTitle.destroy();
        if (this.wardrobeMenuInstructions) this.wardrobeMenuInstructions.destroy();
        
        if (this.wardrobeMenuItems) {
            this.wardrobeMenuItems.forEach(item => {
                if (item.text) item.text.destroy();
                if (item.highlight) item.highlight.destroy();
            });
        }
        
        if (this.wardrobeMenuHandler) {
            this.events.off('update', this.wardrobeMenuHandler);
        }
        
        this.wardrobeMenuOpen = false;
    }
    
    // ==================== SPELLBOOK SYSTEM ====================
    
    openSpellbook() {
        // Check if wearing witch outfit
        if (window.currentOutfit !== 'witch') {
            const dialogue = createDialogueBox(this, "You'll have to change clothes first!");
            this.spellbookMenuOpen = true;
            
            const touchControls = window.touchControls || {};
            this.lastSpellbookA = touchControls.a || false;
            
            const closeDialogue = () => {
                const aPressed = (touchControls.a && !this.lastSpellbookA);
                const spacePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
                
                if (aPressed || spacePressed) {
                    this.buttonSound.play();
                    
                    if (dialogue.box && dialogue.box.scene) {
                        dialogue.box.destroy();
                    }
                    if (dialogue.text && dialogue.text.scene) {
                        dialogue.text.destroy();
                    }
                    
                    this.spellbookMenuOpen = false;
                    // Eat the A press so it doesn't cascade to other interactions
                    this.lastAPressed = true;
                    this.events.off('update', closeDialogue);
                }
                
                this.lastSpellbookA = touchControls.a || false;
            };
            
            this.events.on('update', closeDialogue);
            return;
        }
        
        // Open spellbook menu
        this.spellbookMenuOpen = true;
        this.player.setVelocity(0);
        
        const spells = [
            { key: 'summon', name: 'Summon Spell' }
        ];
        
        this.spellbookSelectedIndex = 0;
        
        // Create menu box with spellbook styling (cream background, brown border)
        const boxWidth = Math.min(400, this.cameras.main.width - 60);
        const boxHeight = Math.min(300, this.cameras.main.height - 100);
        const boxX = this.cameras.main.centerX;
        const boxY = this.cameras.main.centerY;
        
        // Create menu graphics
        const graphics = this.add.graphics();
        graphics.setScrollFactor(0);
        graphics.setDepth(999);
        
        // Shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(boxX - boxWidth/2 + 3, boxY - boxHeight/2 + 3, boxWidth, boxHeight, 4);
        
        // Brown border
        graphics.fillStyle(0x8b4513, 1);
        graphics.fillRoundedRect(boxX - boxWidth/2, boxY - boxHeight/2, boxWidth, boxHeight, 4);
        
        // Cream background
        graphics.fillStyle(0xfffdd0, 1);
        graphics.fillRoundedRect(boxX - boxWidth/2 + 4, boxY - boxHeight/2 + 4, boxWidth - 8, boxHeight - 8, 2);
        
        this.spellbookMenuGraphics = graphics;
        
        // Title
        const title = this.add.text(boxX, boxY - boxHeight/2 + 30, '📖 Spellbook 📖', {
            fontFamily: 'Georgia, serif',
            fontSize: '24px',
            color: '#000000',
            fontStyle: 'bold'
        });
        title.setOrigin(0.5);
        title.setScrollFactor(0);
        title.setDepth(1000);
        this.spellbookMenuTitle = title;
        
        // Create spell items
        this.spellbookMenuItems = [];
        const startY = boxY - boxHeight/2 + 80;
        const itemSpacing = 50;
        
        spells.forEach((spell, index) => {
            const itemY = startY + (index * itemSpacing);
            
            // Highlight box
            const highlight = this.add.graphics();
            highlight.setScrollFactor(0);
            highlight.setDepth(999);
            
            if (index === this.spellbookSelectedIndex) {
                // Gold highlight
                highlight.fillStyle(0xffd700, 1);
                highlight.fillRoundedRect(boxX - boxWidth/2 + 20, itemY - 20, boxWidth - 40, 40, 4);
            }
            
            // Spell name text
            const text = this.add.text(boxX, itemY, spell.name, {
                fontFamily: 'Georgia, serif',
                fontSize: '20px',
                color: '#000000'
            });
            text.setOrigin(0.5);
            text.setScrollFactor(0);
            text.setDepth(1000);
            
            this.spellbookMenuItems.push({ spell, text, highlight });
        });
        
        // Instructions
        const instructions = this.add.text(boxX, boxY + boxHeight/2 - 30, 'UP/DOWN: Select  •  A: Choose  •  B: Close', {
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            color: '#000000'
        });
        instructions.setOrigin(0.5);
        instructions.setScrollFactor(0);
        instructions.setDepth(1000);
        this.spellbookMenuInstructions = instructions;
        
        // Handle menu navigation
        const touchControls = window.touchControls || {};
        this.lastSpellbookUp = touchControls.up || false;
        this.lastSpellbookDown = touchControls.down || false;
        this.lastSpellbookA = touchControls.a || false;
        this.lastSpellbookB = touchControls.b || false;
        
        const handleSpellbookMenu = () => {
            const upPressed = (this.cursors.up.isDown || touchControls.up) && !this.lastSpellbookUp;
            const downPressed = (this.cursors.down.isDown || touchControls.down) && !this.lastSpellbookDown;
            const aPressed = Phaser.Input.Keyboard.JustDown(this.actionKey) || (touchControls.a && !this.lastSpellbookA);
            const bPressed = Phaser.Input.Keyboard.JustDown(this.cursors.shift) || (touchControls.b && !this.lastSpellbookB);
            
            if (upPressed && this.spellbookSelectedIndex > 0) {
                this.buttonSound.play();
                this.spellbookSelectedIndex--;
                this.updateSpellbookHighlight();
            } else if (downPressed && this.spellbookSelectedIndex < spells.length - 1) {
                this.buttonSound.play();
                this.spellbookSelectedIndex++;
                this.updateSpellbookHighlight();
            } else if (aPressed) {
                this.buttonSound.play();
                const selectedSpell = spells[this.spellbookSelectedIndex];
                this.selectSpell(selectedSpell.key);
            } else if (bPressed) {
                this.buttonSound.play();
                this.closeSpellbookMenu();
            }
            
            this.lastSpellbookUp = this.cursors.up.isDown || touchControls.up;
            this.lastSpellbookDown = this.cursors.down.isDown || touchControls.down;
            this.lastSpellbookA = touchControls.a || false;
            this.lastSpellbookB = touchControls.b || false;
        };
        
        this.events.on('update', handleSpellbookMenu);
        this.spellbookMenuHandler = handleSpellbookMenu;
    }
    
    updateSpellbookHighlight() {
        // Redraw all highlights
        this.spellbookMenuItems.forEach((item, index) => {
            item.highlight.clear();
            
            if (index === this.spellbookSelectedIndex) {
                const boxWidth = Math.min(400, this.cameras.main.width - 60);
                const boxHeight = Math.min(300, this.cameras.main.height - 100);
                const boxX = this.cameras.main.centerX;
                const boxY = this.cameras.main.centerY;
                const startY = boxY - boxHeight/2 + 80;
                const itemY = startY + (index * 50);
                
                // Gold highlight
                item.highlight.fillStyle(0xffd700, 1);
                item.highlight.fillRoundedRect(boxX - boxWidth/2 + 20, itemY - 20, boxWidth - 40, 40, 4);
            }
        });
    }
    
    selectSpell(spellKey) {
        console.log('Selected spell:', spellKey);
        
        if (spellKey === 'summon') {
            // Close spellbook menu first
            this.closeSpellbookMenu();
            
            // Open summon selection menu
            this.openSummonMenu();
        }
    }
    
    closeSpellbookMenu() {
        if (this.spellbookMenuGraphics) this.spellbookMenuGraphics.destroy();
        if (this.spellbookMenuTitle) this.spellbookMenuTitle.destroy();
        if (this.spellbookMenuInstructions) this.spellbookMenuInstructions.destroy();
        
        if (this.spellbookMenuItems) {
            this.spellbookMenuItems.forEach(item => {
                if (item.text) item.text.destroy();
                if (item.highlight) item.highlight.destroy();
            });
        }
        
        if (this.spellbookMenuHandler) {
            this.events.off('update', this.spellbookMenuHandler);
        }
        
        this.spellbookMenuOpen = false;
    }
    
    openSummonMenu() {
        // Open summon selection menu
        this.spellbookMenuOpen = true;  // Keep blocking player movement
        this.player.setVelocity(0);
        
        const summons = [
            { key: 'magnus', name: 'Magnus' }
        ];
        
        this.summonSelectedIndex = 0;
        
        // Create menu box with spellbook styling
        const boxWidth = Math.min(400, this.cameras.main.width - 60);
        const boxHeight = Math.min(300, this.cameras.main.height - 100);
        const boxX = this.cameras.main.centerX;
        const boxY = this.cameras.main.centerY;
        
        // Create menu graphics
        const graphics = this.add.graphics();
        graphics.setScrollFactor(0);
        graphics.setDepth(999);
        
        // Shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(boxX - boxWidth/2 + 3, boxY - boxHeight/2 + 3, boxWidth, boxHeight, 4);
        
        // Brown border
        graphics.fillStyle(0x8b4513, 1);
        graphics.fillRoundedRect(boxX - boxWidth/2, boxY - boxHeight/2, boxWidth, boxHeight, 4);
        
        // Cream background
        graphics.fillStyle(0xfffdd0, 1);
        graphics.fillRoundedRect(boxX - boxWidth/2 + 4, boxY - boxHeight/2 + 4, boxWidth - 8, boxHeight - 8, 2);
        
        this.summonMenuGraphics = graphics;
        
        // Title
        const title = this.add.text(boxX, boxY - boxHeight/2 + 30, '✨ Choose Summon ✨', {
            fontFamily: 'Georgia, serif',
            fontSize: '24px',
            color: '#000000',
            fontStyle: 'bold'
        });
        title.setOrigin(0.5);
        title.setScrollFactor(0);
        title.setDepth(1000);
        this.summonMenuTitle = title;
        
        // Create summon items
        this.summonMenuItems = [];
        const startY = boxY - boxHeight/2 + 80;
        const itemSpacing = 50;
        
        summons.forEach((summon, index) => {
            const itemY = startY + (index * itemSpacing);
            
            // Highlight box
            const highlight = this.add.graphics();
            highlight.setScrollFactor(0);
            highlight.setDepth(999);
            
            if (index === this.summonSelectedIndex) {
                // Gold highlight
                highlight.fillStyle(0xffd700, 1);
                highlight.fillRoundedRect(boxX - boxWidth/2 + 20, itemY - 20, boxWidth - 40, 40, 4);
            }
            
            // Summon name text
            const text = this.add.text(boxX, itemY, summon.name, {
                fontFamily: 'Georgia, serif',
                fontSize: '20px',
                color: '#000000'
            });
            text.setOrigin(0.5);
            text.setScrollFactor(0);
            text.setDepth(1000);
            
            this.summonMenuItems.push({ summon, text, highlight });
        });
        
        // Instructions
        const instructions = this.add.text(boxX, boxY + boxHeight/2 - 30, 'UP/DOWN: Select  •  A: Choose  •  B: Back', {
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            color: '#000000'
        });
        instructions.setOrigin(0.5);
        instructions.setScrollFactor(0);
        instructions.setDepth(1000);
        this.summonMenuInstructions = instructions;
        
        // Handle menu navigation
        const touchControls = window.touchControls || {};
        this.lastSummonUp = touchControls.up || false;
        this.lastSummonDown = touchControls.down || false;
        this.lastSummonA = touchControls.a || false;
        this.lastSummonB = touchControls.b || false;
        
        const handleSummonMenu = () => {
            const upPressed = (this.cursors.up.isDown || touchControls.up) && !this.lastSummonUp;
            const downPressed = (this.cursors.down.isDown || touchControls.down) && !this.lastSummonDown;
            const aPressed = Phaser.Input.Keyboard.JustDown(this.actionKey) || (touchControls.a && !this.lastSummonA);
            const bPressed = Phaser.Input.Keyboard.JustDown(this.cursors.shift) || (touchControls.b && !this.lastSummonB);
            
            if (upPressed && this.summonSelectedIndex > 0) {
                this.buttonSound.play();
                this.summonSelectedIndex--;
                this.updateSummonHighlight();
            } else if (downPressed && this.summonSelectedIndex < summons.length - 1) {
                this.buttonSound.play();
                this.summonSelectedIndex++;
                this.updateSummonHighlight();
            } else if (aPressed) {
                this.buttonSound.play();
                const selectedSummon = summons[this.summonSelectedIndex];
                this.chooseSummon(selectedSummon.key);
            } else if (bPressed) {
                this.buttonSound.play();
                this.closeSummonMenu();
                this.openSpellbook();  // Go back to spellbook menu
            }
            
            this.lastSummonUp = this.cursors.up.isDown || touchControls.up;
            this.lastSummonDown = this.cursors.down.isDown || touchControls.down;
            this.lastSummonA = touchControls.a || false;
            this.lastSummonB = touchControls.b || false;
        };
        
        this.events.on('update', handleSummonMenu);
        this.summonMenuHandler = handleSummonMenu;
    }
    
    updateSummonHighlight() {
        // Redraw all highlights
        this.summonMenuItems.forEach((item, index) => {
            item.highlight.clear();
            
            if (index === this.summonSelectedIndex) {
                const boxWidth = Math.min(400, this.cameras.main.width - 60);
                const boxHeight = Math.min(300, this.cameras.main.height - 100);
                const boxX = this.cameras.main.centerX;
                const boxY = this.cameras.main.centerY;
                const startY = boxY - boxHeight/2 + 80;
                const itemY = startY + (index * 50);
                
                // Gold highlight
                item.highlight.fillStyle(0xffd700, 1);
                item.highlight.fillRoundedRect(boxX - boxWidth/2 + 20, itemY - 20, boxWidth - 40, 40, 4);
            }
        });
    }
    
    chooseSummon(summonKey) {
        console.log('Chose summon:', summonKey);
        
        // Close summon menu
        this.closeSummonMenu();
        
        // Activate spellzone for 15 seconds
        this.spellzoneActive = true;
        this.castingUIShown = false;
        
        console.log('Spellzone activated for 15 seconds!');
        
        // Deactivate after 15 seconds
        this.time.delayedCall(15000, () => {
            if (this.spellzoneActive && !this.castingSpell) {
                this.spellzoneActive = false;
                console.log('Spellzone deactivated (time expired)');
            }
        });
    }
    
    closeSummonMenu() {
        if (this.summonMenuGraphics) this.summonMenuGraphics.destroy();
        if (this.summonMenuTitle) this.summonMenuTitle.destroy();
        if (this.summonMenuInstructions) this.summonMenuInstructions.destroy();
        
        if (this.summonMenuItems) {
            this.summonMenuItems.forEach(item => {
                if (item.text) item.text.destroy();
                if (item.highlight) item.highlight.destroy();
            });
        }
        
        if (this.summonMenuHandler) {
            this.events.off('update', this.summonMenuHandler);
        }
        
        this.spellbookMenuOpen = false;
    }
    
    showCastingUI() {
        console.log('Showing casting UI');
        this.castingUIShown = true;
        this.castingSpell = false;
        this.castProgress = 0;
        
        // Create magical casting UI at bottom of screen
        const boxWidth = Math.min(350, this.cameras.main.width - 60);
        const boxHeight = 120;
        const boxX = this.cameras.main.centerX;
        const boxY = this.cameras.main.height - 80; // Position near bottom
        
        // Magical glowing background
        const castingBG = this.add.graphics();
        castingBG.setScrollFactor(0);
        castingBG.setDepth(1000);
        
        // Outer glow (purple)
        castingBG.fillStyle(0x9d4edd, 0.4);
        castingBG.fillRoundedRect(boxX - boxWidth/2 - 4, boxY - boxHeight/2 - 4, boxWidth + 8, boxHeight + 8, 12);
        
        // Middle glow (pink)
        castingBG.fillStyle(0xff006e, 0.6);
        castingBG.fillRoundedRect(boxX - boxWidth/2 - 2, boxY - boxHeight/2 - 2, boxWidth + 4, boxHeight + 4, 10);
        
        // Main border (bright purple)
        castingBG.fillStyle(0xc77dff, 1);
        castingBG.fillRoundedRect(boxX - boxWidth/2, boxY - boxHeight/2, boxWidth, boxHeight, 8);
        
        // Inner background (dark purple with transparency)
        castingBG.fillStyle(0x240046, 0.85);
        castingBG.fillRoundedRect(boxX - boxWidth/2 + 4, boxY - boxHeight/2 + 4, boxWidth - 8, boxHeight - 8, 6);
        
        this.castingBG = castingBG;
        
        // Magical text with glow
        const castingText = this.add.text(boxX, boxY - 25, '✨ Hold A to Cast Spell ✨', {
            fontFamily: 'Georgia, serif',
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#ff006e',
            strokeThickness: 3,
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#c77dff',
                blur: 8,
                fill: true
            }
        });
        castingText.setOrigin(0.5);
        castingText.setScrollFactor(0);
        castingText.setDepth(1001);
        this.castingText = castingText;
        
        // Progress bar background (dark with glow)
        const progressBarWidth = boxWidth - 40;
        const progressBarHeight = 24;
        const progressBarBG = this.add.graphics();
        progressBarBG.setScrollFactor(0);
        progressBarBG.setDepth(1001);
        
        // Outer glow
        progressBarBG.fillStyle(0x9d4edd, 0.5);
        progressBarBG.fillRoundedRect(boxX - progressBarWidth/2 - 2, boxY + 5, progressBarWidth + 4, progressBarHeight + 4, 8);
        
        // Dark background
        progressBarBG.fillStyle(0x10002b, 0.9);
        progressBarBG.fillRoundedRect(boxX - progressBarWidth/2, boxY + 7, progressBarWidth, progressBarHeight, 6);
        this.progressBarBG = progressBarBG;
        
        // Progress bar fill (will be updated in loop)
        const progressBarFill = this.add.graphics();
        progressBarFill.setScrollFactor(0);
        progressBarFill.setDepth(1002);
        this.progressBarFill = progressBarFill;
        
        // Handle casting
        const touchControls = window.touchControls || {};
        this.lastCastA = touchControls.a || false;
        this.castStartTime = null;
        
        const handleCasting = () => {
            const aHeld = this.cursors.space.isDown || touchControls.a;
            
            if (aHeld && !this.castingSpell) {
                // Start casting
                if (!this.castStartTime) {
                    this.castStartTime = this.time.now;
                    this.player.setVelocity(0);
                    this.player.anims.play('spellcast', true);
                }
                
                // Update progress
                const elapsed = this.time.now - this.castStartTime;
                this.castProgress = Math.min(elapsed / 3000, 1); // 3 second cast
                
                // Update progress bar with magical gold gradient
                this.progressBarFill.clear();
                
                const progressBarWidth = boxWidth - 40;
                const progressBarHeight = 24;
                const fillWidth = progressBarWidth * this.castProgress;
                
                if (fillWidth > 0) {
                    // Create gold gradient effect (dark gold to bright gold)
                    const gradient = this.progressBarFill.fillGradientStyle(0xb8860b, 0xb8860b, 0xffd700, 0xffed4e);
                    this.progressBarFill.fillRoundedRect(
                        boxX - progressBarWidth/2, 
                        boxY + 7, 
                        fillWidth, 
                        progressBarHeight, 
                        6
                    );
                    
                    // Add bright glow to the end of the bar
                    this.progressBarFill.fillStyle(0xffff00, 0.8);
                    this.progressBarFill.fillCircle(
                        boxX - progressBarWidth/2 + fillWidth,
                        boxY + 7 + progressBarHeight/2,
                        8
                    );
                }
                
                // Check if cast complete
                if (this.castProgress >= 1) {
                    this.completeCast();
                }
            } else {
                // Reset if A is released
                this.castStartTime = null;
                this.castProgress = 0;
                
                // Clear progress bar
                if (this.progressBarFill) {
                    this.progressBarFill.clear();
                }
            }
            
            this.lastCastA = touchControls.a || false;
        };
        
        this.events.on('update', handleCasting);
        this.castingHandler = handleCasting;
    }
    
    completeCast() {
        console.log('Spell cast complete!');
        this.castingSpell = true;
        
        // Flash pink
        const flash = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width,
            this.cameras.main.height,
            0xff69b4,
            0.8
        );
        flash.setScrollFactor(0);
        flash.setDepth(2000);
        
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                flash.destroy();
            }
        });
        
        // Clean up casting UI
        if (this.castingBG) this.castingBG.destroy();
        if (this.castingText) this.castingText.destroy();
        if (this.progressBarBG) this.progressBarBG.destroy();
        if (this.progressBarFill) this.progressBarFill.destroy();
        if (this.castingHandler) {
            this.events.off('update', this.castingHandler);
        }
        
        // Deactivate spellzone
        this.spellzoneActive = false;
        this.castingUIShown = false;
        
        // Spawn Magnus NPC
        this.summonMagnus();
        
        // Resume normal gameplay
        this.time.delayedCall(500, () => {
            this.castingSpell = false;
        });
    }
    
    summonMagnus(skipGreeting = false) {
        console.log('Summoning Magnus NPC!');
        
        // Create Magnus animations if they don't exist
        // Magnus sprites use EXACT same layout as Dacia: 832x256 = 13 frames per row, 4 rows
        const FRAMES_PER_ROW = 13;
        
        if (!this.anims.exists('magnus-walk-up')) {
            console.log('Creating Magnus animations with FRAMES_PER_ROW =', FRAMES_PER_ROW);
            
            // Walk animations - same as Dacia's
            // Row 0: up, Row 1: left, Row 2: down, Row 3: right
            // Each walk cycle uses frames 0-8 of each row
            
            this.anims.create({
                key: 'magnus-walk-up',
                frames: this.anims.generateFrameNumbers('magnus-walk', { 
                    start: 0 * FRAMES_PER_ROW, 
                    end: 0 * FRAMES_PER_ROW + 8 
                }),
                frameRate: 10,
                repeat: -1
            });
            
            this.anims.create({
                key: 'magnus-walk-left',
                frames: this.anims.generateFrameNumbers('magnus-walk', { 
                    start: 1 * FRAMES_PER_ROW, 
                    end: 1 * FRAMES_PER_ROW + 8 
                }),
                frameRate: 10,
                repeat: -1
            });
            
            this.anims.create({
                key: 'magnus-walk-down',
                frames: this.anims.generateFrameNumbers('magnus-walk', { 
                    start: 2 * FRAMES_PER_ROW, 
                    end: 2 * FRAMES_PER_ROW + 8 
                }),
                frameRate: 10,
                repeat: -1
            });
            
            this.anims.create({
                key: 'magnus-walk-right',
                frames: this.anims.generateFrameNumbers('magnus-walk', { 
                    start: 3 * FRAMES_PER_ROW, 
                    end: 3 * FRAMES_PER_ROW + 8 
                }),
                frameRate: 10,
                repeat: -1
            });
            
            // Idle animations - first frame of each row
            this.anims.create({
                key: 'magnus-idle-up',
                frames: [{ key: 'magnus-idle', frame: 0 * FRAMES_PER_ROW }],
                frameRate: 1
            });
            
            this.anims.create({
                key: 'magnus-idle-left',
                frames: [{ key: 'magnus-idle', frame: 1 * FRAMES_PER_ROW }],
                frameRate: 1
            });
            
            this.anims.create({
                key: 'magnus-idle-down',
                frames: [{ key: 'magnus-idle', frame: 2 * FRAMES_PER_ROW }],
                frameRate: 1
            });
            
            this.anims.create({
                key: 'magnus-idle-right',
                frames: [{ key: 'magnus-idle', frame: 3 * FRAMES_PER_ROW }],
                frameRate: 1
            });
            
            console.log('Magnus animations created successfully!');
        }
        
        // Spawn Magnus farther behind the player (lower on map)
        const spawnX = this.player.x;
        const spawnY = this.player.y + 60; // Increased from 40 to 60 - spawn farther away
        
        console.log('Spawning Magnus at:', spawnX, spawnY);
        
        this.summonedNPC = this.physics.add.sprite(spawnX, spawnY, 'magnus-idle');
        
        // Make Magnus 25% bigger (1.25x scale)
        this.summonedNPC.setScale(1.25);
        
        // Set up physics body for collision - 80% of sprite height
        // Original sprite is 64 pixels, scaled 1.25x = 80 pixels total height
        // 80% of 80 = 64 pixels tall collision box
        this.summonedNPC.body.setSize(20, 64);
        this.summonedNPC.body.setOffset(22, 16); // Centered on sprite
        
        // Set depth to render behind player (player is at depth 10, Magnus at 9)
        this.summonedNPC.setDepth(9);
        
        this.summonedNPC.anims.play('magnus-idle-down', true);
        this.summonedNPC.lastDirection = 'down';
        
        // Add collision between player and Magnus
        this.physics.add.collider(this.player, this.summonedNPC);
        
        // Create interaction zone around Magnus - larger to account for tall collision box
        this.magnusZone = this.add.zone(spawnX, spawnY, 96, 96); // Increased from 64x64 to 96x96
        this.magnusZone.setOrigin(0.5, 0.5);
        this.physics.add.existing(this.magnusZone, true);
        this.nearMagnus = false;
        this.wasNearMagnus = false; // For debug tracking
        
        // Initialize follower system
        this.lastRecordedPlayerPosition = { x: this.player.x, y: this.player.y };
        this.magnusTargetPosition = { x: spawnX, y: spawnY }; // Start at spawn position
        
        console.log('Magnus sprite created!');
        console.log('Magnus position:', spawnX, spawnY);
        console.log('Magnus depth:', this.summonedNPC.depth);
        console.log('Player depth:', this.player.depth);
        console.log('Initial target:', this.magnusTargetPosition);
        
        // NO COLLISION - Magnus can phase through everything!
        // Don't add any colliders for Magnus
        
        // Magnus follows player for 60 seconds
        this.summonedNPC.followPlayer = true;
        
        // Store Magnus summon state globally for cross-scene persistence
        window.magnusSummonState = {
            active: true,
            timeRemaining: 20000, // 20 seconds in milliseconds
            summonStartTime: Date.now()
        };
        
        // Show greeting dialogue (unless re-summoning from scene transition)
        if (!skipGreeting) {
            const greetingDialogue = createMagnusDialogueBox(this, "Hey babe! I'm here to help!");
            
            // Auto-close after 2.5 seconds
            this.time.delayedCall(2500, () => {
                if (greetingDialogue.box && greetingDialogue.box.scene) {
                    greetingDialogue.box.destroy();
                }
                if (greetingDialogue.text && greetingDialogue.text.scene) {
                    greetingDialogue.text.destroy();
                }
            });
        }
        
        // Set up timer for 60 seconds
        this.summonTimer = this.time.delayedCall(20000, () => {
            this.dismissMagnus();
        });
        
        console.log('Magnus summoned! Following for 60 seconds. NO COLLISION enabled.');
    }
    
    dismissMagnus() {
        if (!this.summonedNPC) return;
        
        console.log('Magnus leaving...');
        
        // Clear global summon state
        window.magnusSummonState = null;
        
        // Show farewell dialogue with burnt orange styling
        const dialogue = createMagnusDialogueBox(this, 'Bye babe!');
        
        // Wait a moment, then fade out Magnus
        this.time.delayedCall(1500, () => {
            if (dialogue.box && dialogue.box.scene) {
                dialogue.box.destroy();
            }
            if (dialogue.text && dialogue.text.scene) {
                dialogue.text.destroy();
            }
            
            // Fade out Magnus
            this.tweens.add({
                targets: this.summonedNPC,
                alpha: 0,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => {
                    if (this.summonedNPC) {
                        this.summonedNPC.destroy();
                        this.summonedNPC = null;
                    }
                    if (this.magnusZone) {
                        this.magnusZone.destroy();
                        this.magnusZone = null;
                    }
                }
            });
        });
    }
    
    showMagnusDialogue() {
        // Prevent multiple dialogues at once
        if (this.magnusDialogueOpen) return;
        
        this.magnusDialogueOpen = true;
        this.player.setVelocity(0);
        
        const dialogue = createMagnusDialogueBox(this, "Wow.. you look really cute today.");
        
        const touchControls = window.touchControls || {};
        this.lastMagnusA = touchControls.a || false;
        
        const closeDialogue = () => {
            const aPressed = (touchControls.a && !this.lastMagnusA);
            const spacePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aPressed || spacePressed) {
                this.buttonSound.play();
                
                if (dialogue.box && dialogue.box.scene) {
                    dialogue.box.destroy();
                }
                if (dialogue.text && dialogue.text.scene) {
                    dialogue.text.destroy();
                }
                
                this.magnusDialogueOpen = false;
                this.events.off('update', closeDialogue);
            }
            
            this.lastMagnusA = touchControls.a || false;
        };
        
        this.events.on('update', closeDialogue);
    }
    
    pickupLaundry() {
        console.log('Picking up dirty laundry');
        
        // Mark laundry as picked up
        window.laundryPickedUp = true;
        // Laundry still exists (just picked up, not washed yet)
        window.laundryExists = true;
        
        // Hide the laundry tile layer
        if (this.laundryLayer) {
            this.laundryLayer.setVisible(false);
            console.log('Laundry tile layer hidden');
        }
        
        // Destroy bin collision objects
        if (this.binCollisionObjects && this.binCollisionObjects.length > 0) {
            this.binCollisionObjects.forEach(binCollision => {
                if (binCollision && binCollision.body) {
                    binCollision.destroy();
                }
            });
            this.binCollisionObjects = [];
            console.log('Bin collision objects destroyed');
        }
        
        // Destroy laundry interaction zone
        if (this.laundryZone) {
            this.laundryZone.destroy();
            this.laundryZone = null;
        }
        
        // Show pickup message
        const dialogue = createDialogueBox(this, 'Obtained: Dirty Laundry');
        
        const touchControls = window.touchControls || {};
        this.lastLaundryA = touchControls.a || false;
        
        const closeDialogue = () => {
            const aPressed = (touchControls.a && !this.lastLaundryA);
            const spacePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aPressed || spacePressed) {
                this.buttonSound.play();
                
                if (dialogue.box && dialogue.box.scene) {
                    dialogue.box.destroy();
                }
                if (dialogue.text && dialogue.text.scene) {
                    dialogue.text.destroy();
                }
                
                this.events.off('update', closeDialogue);
            }
            
            this.lastLaundryA = touchControls.a || false;
        };
        
        this.events.on('update', closeDialogue);
    }

    pickupCD(cdKey) {
        // Mark CD as collected
        window.cdLibrary[cdKey].collected = true;
        
        // Hide the CD tile layer
        const cdLayer = this.map.getLayer(cdKey);
        if (cdLayer && cdLayer.tilemapLayer) {
            cdLayer.tilemapLayer.setVisible(false);
        }
        
        // Destroy the interaction zone
        if (this.toDaciaCDZone) {
            this.toDaciaCDZone.destroy();
            this.toDaciaCDZone = null;
        }
        
        // Show pickup message
        const cdName = window.cdLibrary[cdKey].name;
        this.cdPickupOpen = true;
        this.player.setVelocity(0);
        
        const dialogue = createDialogueBox(this, `You found CD: ${cdName}!`);
        this.cdPickupBox = dialogue.box;
        this.cdPickupText = dialogue.text;
        
        // Wait before allowing close
        this.time.delayedCall(50, () => {
            this.canCloseCDPickup = true;
        });
        
        const touchControls = window.touchControls || {};
        this.lastCDPickupA = touchControls.a || false;
        this.lastCDPickupB = touchControls.b || false;
        
        // Close handler
        const closeDialogue = () => {
            if (!this.canCloseCDPickup) {
                this.lastCDPickupA = touchControls.a || false;
                this.lastCDPickupB = touchControls.b || false;
                return;
            }
            
            const aPressed = (touchControls.a && !this.lastCDPickupA);
            const bPressed = (touchControls.b && !this.lastCDPickupB);
            const spacePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aPressed || bPressed || spacePressed) {
                this.buttonSound.play();
                
                // Clean up dialogue
                if (this.cdPickupBox && this.cdPickupBox.scene) {
                    this.cdPickupBox.destroy();
                }
                if (this.cdPickupText && this.cdPickupText.scene) {
                    this.cdPickupText.destroy();
                }
                
                // Re-enable player movement
                this.cdPickupOpen = false;
                
                this.events.off('update', closeDialogue);
            }
            
            this.lastCDPickupA = touchControls.a || false;
            this.lastCDPickupB = touchControls.b || false;
        };
        
        this.events.on('update', closeDialogue);
        
        // Save progress
        this.autoSaveProgress();
    }
    
    showRadioMenu() {
        this.radioMenuOpen = true;
        this.player.setVelocity(0);
        
        // Get collected CDs
        const collectedCDs = Object.keys(window.cdLibrary).filter(key => window.cdLibrary[key].collected);
        
        if (collectedCDs.length === 0) {
            // No CDs collected yet
            const dialogue = createDialogueBox(this, 'No CDs collected yet. Find some around the house!');
            
            this.time.delayedCall(50, () => {
                this.canCloseEmptyRadio = true;
            });
            
            const touchControls = window.touchControls || {};
            this.lastRadioA = touchControls.a || false;
            
            const closeDialogue = () => {
                if (!this.canCloseEmptyRadio) {
                    this.lastRadioA = touchControls.a || false;
                    return;
                }
                
                const aPressed = (touchControls.a && !this.lastRadioA);
                const spacePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
                
                if (aPressed || spacePressed) {
                    this.buttonSound.play();
                    
                    if (dialogue.box && dialogue.box.scene) {
                        dialogue.box.destroy();
                    }
                    if (dialogue.text && dialogue.text.scene) {
                        dialogue.text.destroy();
                    }
                    
                    this.radioMenuOpen = false;
                    this.events.off('update', closeDialogue);
                }
                
                this.lastRadioA = touchControls.a || false;
            };
            
            this.events.on('update', closeDialogue);
            return;
        }
        
        // Create larger menu box
        const boxWidth = Math.min(500, this.cameras.main.width - 60);
        const boxHeight = Math.min(400, this.cameras.main.height - 100);
        const boxX = this.cameras.main.centerX;
        const boxY = this.cameras.main.centerY;
        
        // Create menu graphics
        const graphics = this.add.graphics();
        graphics.setScrollFactor(0);
        graphics.setDepth(999);
        
        // Shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(boxX - boxWidth/2 + 3, boxY - boxHeight/2 + 3, boxWidth, boxHeight, 4);
        
        // Pink border
        graphics.fillStyle(0xf0a0c8, 1);
        graphics.fillRoundedRect(boxX - boxWidth/2, boxY - boxHeight/2, boxWidth, boxHeight, 4);
        
        // Cream background
        graphics.fillStyle(0xfff8f0, 1);
        graphics.fillRoundedRect(boxX - boxWidth/2 + 5, boxY - boxHeight/2 + 5, boxWidth - 10, boxHeight - 10, 3);
        
        // Corner accents
        const accentColor = 0xe891b8;
        const cornerOffset = 12;
        graphics.fillStyle(accentColor, 1);
        graphics.fillCircle(boxX - boxWidth/2 + cornerOffset, boxY - boxHeight/2 + cornerOffset, 3);
        graphics.fillCircle(boxX + boxWidth/2 - cornerOffset, boxY - boxHeight/2 + cornerOffset, 3);
        graphics.fillCircle(boxX - boxWidth/2 + cornerOffset, boxY + boxHeight/2 - cornerOffset, 3);
        graphics.fillCircle(boxX + boxWidth/2 - cornerOffset, boxY + boxHeight/2 - cornerOffset, 3);
        
        this.radioMenuBox = graphics;
        
        // Title
        const titleText = this.add.text(boxX, boxY - boxHeight/2 + 30, 'CD Collection 🎵', {
            fontSize: '19px',
            color: '#000000',
            fontStyle: 'bold'
        });
        titleText.setOrigin(0.5);
        titleText.setScrollFactor(0);
        titleText.setDepth(1000);
        this.radioMenuTitle = titleText;
        
        // CD list
        this.radioMenuTexts = [];
        this.selectedCDIndex = 0;
        
        collectedCDs.forEach((cdKey, index) => {
            const cdName = window.cdLibrary[cdKey].name;
            const yPos = boxY - boxHeight/2 + 70 + (index * 40);
            
            const cdText = this.add.text(boxX, yPos, cdName, {
                fontSize: '17px',
                color: index === 0 ? '#e891b8' : '#000000',
                fontStyle: index === 0 ? 'bold' : 'normal'
            });
            cdText.setOrigin(0.5);
            cdText.setScrollFactor(0);
            cdText.setDepth(1000);
            cdText.cdKey = cdKey;
            
            this.radioMenuTexts.push(cdText);
        });
        
        // Instructions
        const instructText = this.add.text(boxX, boxY + boxHeight/2 - 30, 
            '↑↓ to select • A to play • B to cancel', {
            fontSize: '13px',
            color: '#666666'
        });
        instructText.setOrigin(0.5);
        instructText.setScrollFactor(0);
        instructText.setDepth(1000);
        this.radioMenuInstruct = instructText;
        
        // Handle menu navigation
        this.handleRadioMenuInput(collectedCDs);
    }
    
    handleRadioMenuInput(collectedCDs) {
        const touchControls = window.touchControls || {};
        this.lastRadioUp = touchControls.up || false;
        this.lastRadioDown = touchControls.down || false;
        this.lastRadioA = touchControls.a || false;
        this.lastRadioB = touchControls.b || false;
        
        this.time.delayedCall(50, () => {
            this.canUseRadioMenu = true;
        });
        
        const menuUpdate = () => {
            if (!this.canUseRadioMenu) {
                this.lastRadioUp = touchControls.up || false;
                this.lastRadioDown = touchControls.down || false;
                this.lastRadioA = touchControls.a || false;
                this.lastRadioB = touchControls.b || false;
                return;
            }
            
            const upPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) || 
                             (touchControls.up && !this.lastRadioUp);
            const downPressed = Phaser.Input.Keyboard.JustDown(this.cursors.down) || 
                               (touchControls.down && !this.lastRadioDown);
            const aPressed = Phaser.Input.Keyboard.JustDown(this.actionKey) || 
                           (touchControls.a && !this.lastRadioA);
            const bPressed = (touchControls.b && !this.lastRadioB);
            
            // Navigate up
            if (upPressed && this.selectedCDIndex > 0) {
                this.buttonSound.play();
                this.radioMenuTexts[this.selectedCDIndex].setColor('#000000');
                this.radioMenuTexts[this.selectedCDIndex].setFontStyle('normal');
                this.selectedCDIndex--;
                this.radioMenuTexts[this.selectedCDIndex].setColor('#e891b8');
                this.radioMenuTexts[this.selectedCDIndex].setFontStyle('bold');
            }
            
            // Navigate down
            if (downPressed && this.selectedCDIndex < collectedCDs.length - 1) {
                this.buttonSound.play();
                this.radioMenuTexts[this.selectedCDIndex].setColor('#000000');
                this.radioMenuTexts[this.selectedCDIndex].setFontStyle('normal');
                this.selectedCDIndex++;
                this.radioMenuTexts[this.selectedCDIndex].setColor('#e891b8');
                this.radioMenuTexts[this.selectedCDIndex].setFontStyle('bold');
            }
            
            // Select CD
            if (aPressed) {
                this.buttonSound.play();
                const selectedKey = this.radioMenuTexts[this.selectedCDIndex].cdKey;
                this.playCD(selectedKey);
                this.closeRadioMenu();
            }
            
            // Cancel
            if (bPressed) {
                this.buttonSound.play();
                this.closeRadioMenu();
            }
            
            this.lastRadioUp = touchControls.up || false;
            this.lastRadioDown = touchControls.down || false;
            this.lastRadioA = touchControls.a || false;
            this.lastRadioB = touchControls.b || false;
        };
        
        this.events.on('update', menuUpdate);
        this.radioMenuUpdate = menuUpdate;
    }
    
    closeRadioMenu() {
        // Clean up menu graphics
        if (this.radioMenuBox) this.radioMenuBox.destroy();
        if (this.radioMenuTitle) this.radioMenuTitle.destroy();
        if (this.radioMenuInstruct) this.radioMenuInstruct.destroy();
        if (this.radioMenuTexts) {
            this.radioMenuTexts.forEach(text => text.destroy());
        }
        
        if (this.radioMenuUpdate) {
            this.events.off('update', this.radioMenuUpdate);
        }
        
        this.radioMenuOpen = false;
    }
    
    playCD(cdKey) {
        // Stop current CD music
        if (window.currentMusic && window.currentMusic.isPlaying) {
            window.currentMusic.stop();
        }
        
        // Stop background music
        const bgMusic = this.sound.get('bgMusic');
        if (bgMusic && bgMusic.isPlaying) {
            bgMusic.stop();
        }
        
        // Stop scary music (if in Connor's room)
        const scaryMusic = this.sound.get('scaryMusic');
        if (scaryMusic && scaryMusic.isPlaying) {
            scaryMusic.stop();
        }
        
        // Set current CD
        window.currentCD = cdKey;
        window.currentTrackIndex = 0;
        
        // Play first track
        this.playNextTrack();
    }
    
    playNextTrack() {
        if (!window.currentCD) return;
        
        const cd = window.cdLibrary[window.currentCD];
        if (!cd || window.currentTrackIndex >= cd.tracks.length) {
            // Loop back to first track
            window.currentTrackIndex = 0;
        }
        
        const trackPath = cd.tracks[window.currentTrackIndex];
        console.log('Attempting to play track:', trackPath, 'index:', window.currentTrackIndex);
        
        // Load and play track
        if (!this.sound.get(trackPath)) {
            console.log('Loading track:', trackPath);
            this.load.audio(trackPath, trackPath);
            this.load.once('complete', () => {
                console.log('Track loaded:', trackPath);
                const music = this.sound.add(trackPath, { volume: 0.3 });
                window.MusicManager.play(music, 'cd');
                
                // When track ends, play next
                music.once('complete', () => {
                    console.log('Track complete, advancing...');
                    window.currentTrackIndex++;
                    // Find the active scene with resumeCD or playNextTrack
                    const activeScene = this.scene.manager.getScenes(true)[0];
                    if (activeScene && activeScene.resumeCD) {
                        activeScene.resumeCD();
                    } else if (activeScene && activeScene.playNextTrack) {
                        activeScene.playNextTrack();
                    }
                });
            });
            this.load.start();
        } else {
            console.log('Track already loaded, playing:', trackPath);
            const music = this.sound.get(trackPath);
            window.MusicManager.play(music, 'cd');
            
            music.once('complete', () => {
                console.log('Track complete, advancing...');
                window.currentTrackIndex++;
                // Find the active scene with resumeCD or playNextTrack
                const activeScene = this.scene.manager.getScenes(true)[0];
                if (activeScene && activeScene.resumeCD) {
                    activeScene.resumeCD();
                } else if (activeScene && activeScene.playNextTrack) {
                    activeScene.playNextTrack();
                }
            });
        }
    }
    
    autoSaveProgress() {
        if (!this.player) return;
        
        const saveData = {
            currentScene: this.scene.key,
            playerPosition: {
                x: this.player.x,
                y: this.player.y
            },
            lastDirection: window.lastDirection,
            triggeredEvents: window.triggeredEvents,
            cdCollection: window.cdLibrary
        };
        
        saveGameState(window.currentPlayer, saveData);
    }
}

// Connor's Room Scene
class ConnorRoomScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ConnorRoomScene' });
    }

    preload() {
        console.log('Loading Connor\'s room assets...');
        
        // Load character sprites (in case this is the first scene)
        loadCharacterSprites(this);
        
        // Load all Connor's room tilesets
        this.load.image('room_builder', 'tilesets/room_builder.png');
        this.load.image('bedroom', 'tilesets/bedroom.png');
        this.load.image('beach', 'tilesets/beach.png');
        this.load.image('generic', 'tilesets/generic.png');
        this.load.image('basement', 'tilesets/basement.png');
        this.load.image('living_room', 'tilesets/living_room.png');
        this.load.image('jail', 'tilesets/jail.png');
        this.load.image('tv', 'tilesets/tv.png');
        this.load.image('halloween', 'tilesets/halloween.png');
        this.load.image('floors', 'tilesets/floors.png');
        
        // Load sounds (in case this is the first scene)
        this.load.audio('buttonPress', 'sounds/button_press.mp3');
        this.load.audio('doorSound', 'sounds/door_sound.mp3');
        this.load.audio('scaryMusic', 'sounds/scary_music.mp3');
        
        // Load Connor's room map
        this.load.tilemapTiledJSON('connor_room', 'maps/connor_room.json');
    }

    create() {
        console.log('Creating Connor\'s room...');
        
        // Save current CD if playing (we'll resume it when leaving)
        if (window.currentCD && window.currentMusic && window.currentMusic.isPlaying) {
            window.pausedCD = window.currentCD;
            window.pausedTrackIndex = window.currentTrackIndex;
            window.currentMusic.stop();
            console.log('Paused CD:', window.pausedCD, 'at track', window.pausedTrackIndex);
        }
        
        const map = this.make.tilemap({ key: 'connor_room' });
        
        // Set physics world bounds
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        
        // Add all tilesets
        const allTilesets = [
            map.addTilesetImage('room_builder', 'room_builder'),
            map.addTilesetImage('bedroom', 'bedroom'),
            map.addTilesetImage('beach', 'beach'),
            map.addTilesetImage('generic', 'generic'),
            map.addTilesetImage('basement', 'basement'),
            map.addTilesetImage('living_room', 'living_room'),
            map.addTilesetImage('jail', 'jail'),
            map.addTilesetImage('tv', 'tv'),
            map.addTilesetImage('halloween', 'halloween'),
            map.addTilesetImage('floors', 'floors')
        ];
        
        // Create layers - matching the layer names from your JSON
        const floorLayer = map.createLayer('floor', allTilesets, 0, 0);
        const wallLayer = map.createLayer('wall', allTilesets, 0, 0);
        const ladderLayer = map.createLayer('ladder', allTilesets, 0, 0);
        const bedLayer = map.createLayer('bed', allTilesets, 0, 0);
        const onFloorLayer = map.createLayer('on_floor', allTilesets, 0, 0);
        const miscLayer = map.createLayer('misc', allTilesets, 0, 0);
        const websLayer = map.createLayer('webs', allTilesets, 0, 0);
        const collisionLayer = map.createLayer('collision', allTilesets, 0, 0);
        
        // Hide and set collision
        if (collisionLayer) {
            collisionLayer.setVisible(false);
            collisionLayer.setCollisionByExclusion([-1]);
        }
        
        // Get spawn position (from save or default)
        const objectLayer = map.getObjectLayer('objects');
        const spawn = window.getSpawnPosition('ConnorRoomScene', objectLayer, 200, 300, this.scene.settings.data);
        
        // Create player
        this.player = this.physics.add.sprite(spawn.x, spawn.y, 'dacia-idle');
        this.player.setCollideWorldBounds(true);
        this.player.setSize(20, 20);
        this.player.setOffset(22, 44);
        this.player.setDepth(10); // Set explicit depth so followers can render behind
        
        // Set up collision
        if (collisionLayer) {
            this.physics.add.collider(this.player, collisionLayer);
        }
        
        // Add collision objects
        const collisionObjectsLayer = map.getObjectLayer('collision');
        if (collisionObjectsLayer) {
            collisionObjectsLayer.objects.forEach(obj => {
                const collisionRect = this.add.rectangle(obj.x, obj.y, obj.width, obj.height);
                collisionRect.setOrigin(0, 0);
                this.physics.add.existing(collisionRect, true);
                this.physics.add.collider(this.player, collisionRect);
            });
        }
        
        // Camera
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        
        // Create animations (shared function)
        createAnimations(this);
        
        // Set up sounds (reuse from apartment)
        this.buttonSound = this.sound.add('buttonPress', { volume: 0.5 });
        this.doorSound = this.sound.add('doorSound', { volume: 0.6 });
        
        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.actionKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // Set up door back to apartment - auto trigger on overlap
        if (objectLayer) {
            const door = objectLayer.objects.find(obj => obj.name === 'door_to_apartment');
            if (door) {
                this.doorZone = this.add.zone(door.x, door.y, door.width || 32, door.height || 32);
                this.doorZone.setOrigin(0, 0);
                this.physics.add.existing(this.doorZone, true);
                
                this.doorTriggered = false;
                
                this.physics.add.overlap(this.player, this.doorZone, () => {
                    if (!this.doorTriggered) {
                        this.doorTriggered = true;
                        this.doorSound.play();
                        
                        // Stop all music when leaving (scary music or any CD)
                        window.MusicManager.stopAll();
                        
                        // Resume CD if one was playing
                        if (window.pausedCD) {
                            window.currentCD = window.pausedCD;
                            window.currentTrackIndex = window.pausedTrackIndex || 0;
                            window.pausedCD = null;
                            window.pausedTrackIndex = null;
                            console.log('Resuming CD:', window.currentCD);
                        }
                        
                        this.time.delayedCall(200, () => {
                            this.scene.start('ApartmentScene', { from: 'ConnorRoomScene' });
                        });
                    }
                }, null, this);
            }
            
            // Power switch with spider - key story interaction!
            const powerSwitch = objectLayer.objects.find(obj => obj.name === 'power');
            if (powerSwitch) {
                this.powerZone = this.add.zone(powerSwitch.x, powerSwitch.y, 
                                               powerSwitch.width || 32, powerSwitch.height || 32);
                this.powerZone.setOrigin(0, 0);
                this.physics.add.existing(this.powerZone, true);
                
                this.nearPower = false;
                this.powerScareTriggered = false;
                
                this.physics.add.overlap(this.player, this.powerZone, () => {
                    this.nearPower = true;
                    
                    // If Magnus IS currently summoned in this scene, Dacia can approach (no scare)
                    // If Magnus is NOT currently present and power is still off, she runs away!
                    if (!this.summonedNPC && !window.triggeredEvents?.connorRoomPowerOn && !this.powerScareTriggered) {
                        this.powerScareTriggered = true;
                        this.runAwayFromSpider();
                    }
                }, null, this);
            }
            
            // Rail object - skate reference
            const rail = objectLayer.objects.find(obj => obj.name === 'rail');
            if (rail) {
                this.railZone = this.add.zone(rail.x, rail.y, rail.width || 32, rail.height || 32);
                this.railZone.setOrigin(0, 0);
                this.physics.add.existing(this.railZone, true);
                this.nearRail = false;
                
                this.physics.add.overlap(this.player, this.railZone, () => {
                    this.nearRail = true;
                }, null, this);
            }
            
            // Bones object - headbang victims
            const bones = objectLayer.objects.find(obj => obj.name === 'bones');
            if (bones) {
                this.bonesZone = this.add.zone(bones.x, bones.y, bones.width || 32, bones.height || 32);
                this.bonesZone.setOrigin(0, 0);
                this.physics.add.existing(this.bonesZone, true);
                this.nearBones = false;
                
                this.physics.add.overlap(this.player, this.bonesZone, () => {
                    this.nearBones = true;
                }, null, this);
            }
            
            // DJ object - needs power
            const dj = objectLayer.objects.find(obj => obj.name === 'dj');
            if (dj) {
                this.djZone = this.add.zone(dj.x, dj.y, dj.width || 32, dj.height || 32);
                this.djZone.setOrigin(0, 0);
                this.physics.add.existing(this.djZone, true);
                this.nearDJ = false;
                
                this.physics.add.overlap(this.player, this.djZone, () => {
                    this.nearDJ = true;
                }, null, this);
            }
            
            // Screen object - needs power
            const screen = objectLayer.objects.find(obj => obj.name === 'screen');
            if (screen) {
                this.screenZone = this.add.zone(screen.x, screen.y, screen.width || 32, screen.height || 32);
                this.screenZone.setOrigin(0, 0);
                this.physics.add.existing(this.screenZone, true);
                this.nearScreen = false;
                
                this.physics.add.overlap(this.player, this.screenZone, () => {
                    this.nearScreen = true;
                }, null, this);
            }
            
            // TV object - needs power
            const tv = objectLayer.objects.find(obj => obj.name === 'tv');
            if (tv) {
                this.tvZone = this.add.zone(tv.x, tv.y, tv.width || 32, tv.height || 32);
                this.tvZone.setOrigin(0, 0);
                this.physics.add.existing(this.tvZone, true);
                this.nearTV = false;
                
                this.physics.add.overlap(this.player, this.tvZone, () => {
                    this.nearTV = true;
                }, null, this);
            }
            
            // Coffin object - reveals Connor
            const coffin = objectLayer.objects.find(obj => obj.name === 'coffin');
            if (coffin) {
                this.coffinZone = this.add.zone(coffin.x, coffin.y, coffin.width || 32, coffin.height || 32);
                this.coffinZone.setOrigin(0, 0);
                this.physics.add.existing(this.coffinZone, true);
                this.nearCoffin = false;
                
                this.physics.add.overlap(this.player, this.coffinZone, () => {
                    this.nearCoffin = true;
                }, null, this);
            }
        }
        
        console.log('Connor\'s room created!');
        
        // Initialize Magnus summon state
        this.summonedNPC = null;
        this.summonTimer = null;
        this.lastRecordedPlayerPosition = null;
        this.magnusTargetPosition = null;
        
        // Check if Magnus should be active from previous scene
        checkAndRestoreMagnus(this);
        
        // Autosave when entering scene
        this.time.delayedCall(500, () => {
            window.saveGame(this);
        });
        
        // Check if this is the first time visiting Connor's room
        const isFirstVisit = !window.triggeredEvents?.visitedConnorRoomFirstTime;
        
        if (isFirstVisit) {
            // Trigger the first-visit cinematic
            this.playFirstVisitCinematic();
        } else if (!window.triggeredEvents?.connorRoomPowerOn) {
            // Not first visit, but power is still off - play scary music
            if (!this.sound.get('scaryMusic')) {
                this.scaryMusic = this.sound.add('scaryMusic', { volume: 0.3, loop: true });
            } else {
                this.scaryMusic = this.sound.get('scaryMusic');
            }
            if (!this.scaryMusic.isPlaying) {
                window.MusicManager.play(this.scaryMusic, 'event');
            }
        }
    }
    
    // Magnus summon system - uses global function
    summonMagnus(skipGreeting = false) {
        window.globalSummonMagnus(this, skipGreeting);
    }
    
    dismissMagnus() {
        window.globalDismissMagnus(this);
    }
    
    playFirstVisitCinematic() {
        // Disable player movement
        this.cinematicPlaying = true;
        this.player.setVelocity(0);
        
        // Create black overlay to start
        const blackOverlay = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000
        );
        blackOverlay.setScrollFactor(0);
        blackOverlay.setDepth(2000);
        blackOverlay.setAlpha(1);
        
        // Stop any playing music
        if (window.currentMusic && window.currentMusic.isPlaying) {
            window.currentMusic.stop();
        }
        
        // Start scary music for the cinematic
        if (!this.sound.get('scaryMusic')) {
            this.scaryMusic = this.sound.add('scaryMusic', { volume: 0.3, loop: true });
        } else {
            this.scaryMusic = this.sound.get('scaryMusic');
        }
        window.MusicManager.play(this.scaryMusic, 'event');
        
        // Wait a moment in darkness
        this.time.delayedCall(500, () => {
            // "Turn on the lights" - fade out the black overlay
            this.tweens.add({
                targets: blackOverlay,
                alpha: 0,
                duration: 1500,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    blackOverlay.destroy();
                    
                    // Camera shake for dramatic effect!
                    this.cameras.main.shake(400, 0.008);
                    
                    this.time.delayedCall(400, () => {
                        // Show dialogue
                        this.showFirstVisitDialogue();
                    });
                }
            });
        });
    }
    
    showFirstVisitDialogue() {
        // Show the dialogue box
        const dialogue = createDialogueBox(this, 'What happened in here?!');
        this.firstVisitDialogueBox = dialogue.box;
        this.firstVisitDialogueText = dialogue.text;
        
        // Wait before allowing close
        this.time.delayedCall(100, () => {
            this.canCloseFirstVisit = true;
        });
        
        const touchControls = window.touchControls || {};
        this.lastFirstVisitA = touchControls.a || false;
        this.lastFirstVisitB = touchControls.b || false;
        
        // Close handler
        const closeDialogue = () => {
            if (!this.canCloseFirstVisit) {
                this.lastFirstVisitA = touchControls.a || false;
                this.lastFirstVisitB = touchControls.b || false;
                return;
            }
            
            const aPressed = (touchControls.a && !this.lastFirstVisitA);
            const bPressed = (touchControls.b && !this.lastFirstVisitB);
            const spacePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aPressed || bPressed || spacePressed) {
                this.buttonSound.play();
                
                // Clean up dialogue
                if (this.firstVisitDialogueBox && this.firstVisitDialogueBox.scene) {
                    this.firstVisitDialogueBox.destroy();
                }
                if (this.firstVisitDialogueText && this.firstVisitDialogueText.scene) {
                    this.firstVisitDialogueText.destroy();
                }
                
                // Re-enable player movement
                this.cinematicPlaying = false;
                
                // Mark event as triggered
                window.triggeredEvents.visitedConnorRoomFirstTime = true;
                
                // Auto-save progress
                this.autoSaveProgress();
                
                this.events.off('update', closeDialogue);
            }
            
            this.lastFirstVisitA = touchControls.a || false;
            this.lastFirstVisitB = touchControls.b || false;
        };
        
        this.events.on('update', closeDialogue);
    }
    
    autoSaveProgress() {
        // Auto-save the triggered event
        if (!this.player) return;
        
        const saveData = {
            currentScene: this.scene.key,
            playerPosition: {
                x: this.player.x,
                y: this.player.y
            },
            lastDirection: window.lastDirection,
            triggeredEvents: window.triggeredEvents
        };
        
        saveGameState(window.currentPlayer, saveData);
    }
    
    runAwayFromSpider() {
        // Dacia is scared! Make her run backwards
        this.cinematicPlaying = true;
        this.player.setVelocity(0);
        
        // Calculate direction away from power switch
        const runSpeed = 300; // Velocity for running away
        let velocityX = 0;
        let velocityY = 0;
        
        // Run in opposite direction of last movement
        if (lastDirection === 'up') {
            velocityY = runSpeed;
        } else if (lastDirection === 'down') {
            velocityY = -runSpeed;
        } else if (lastDirection === 'left') {
            velocityX = runSpeed;
        } else if (lastDirection === 'right') {
            velocityX = -runSpeed;
        } else {
            // Default: run down
            velocityY = runSpeed;
        }
        
        // Set velocity to run backwards
        this.player.setVelocity(velocityX, velocityY);
        
        // Stop after a short duration and show dialogue
        this.time.delayedCall(250, () => {
            this.player.setVelocity(0);
            this.player.anims.stop();
            window.WitchIdleManager.onMovementStop();
            window.playIdleAnimation(this.player, lastDirection);
            
            // Small delay before showing dialogue for better flow
            this.time.delayedCall(100, () => {
                this.showSpiderScareDialogue();
            });
        });
    }
    
    showSpiderScareDialogue() {
        const dialogue = createDialogueBox(this, 'EW! IM NOT GOING NEAR THAT THING!');
        this.spiderDialogueBox = dialogue.box;
        this.spiderDialogueText = dialogue.text;
        
        // Wait before allowing close
        this.time.delayedCall(100, () => {
            this.canCloseSpiderDialogue = true;
        });
        
        const touchControls = window.touchControls || {};
        this.lastSpiderA = touchControls.a || false;
        this.lastSpiderB = touchControls.b || false;
        
        // Close handler
        const closeDialogue = () => {
            if (!this.canCloseSpiderDialogue) {
                this.lastSpiderA = touchControls.a || false;
                this.lastSpiderB = touchControls.b || false;
                return;
            }
            
            const aPressed = (touchControls.a && !this.lastSpiderA);
            const bPressed = (touchControls.b && !this.lastSpiderB);
            const spacePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aPressed || bPressed || spacePressed) {
                this.buttonSound.play();
                
                // Clean up dialogue
                if (this.spiderDialogueBox && this.spiderDialogueBox.scene) {
                    this.spiderDialogueBox.destroy();
                }
                if (this.spiderDialogueText && this.spiderDialogueText.scene) {
                    this.spiderDialogueText.destroy();
                }
                
                // Re-enable player movement
                this.cinematicPlaying = false;
                
                // Reset scare trigger so it can happen again if she approaches
                this.time.delayedCall(1000, () => {
                    this.powerScareTriggered = false;
                });
                
                this.events.off('update', closeDialogue);
            }
            
            this.lastSpiderA = touchControls.a || false;
            this.lastSpiderB = touchControls.b || false;
        };
        
        this.events.on('update', closeDialogue);
    }
    
    openCoffin() {
        console.log('Opening coffin!');
        
        // Mark coffin as opened
        window.triggeredEvents.coffinOpened = true;
        
        // Freeze player
        this.cinematicPlaying = true;
        this.player.setVelocity(0);
        
        // White flash effect
        const flash = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width * 2,
            this.cameras.main.height * 2,
            0xffffff,
            1
        );
        flash.setScrollFactor(0);
        flash.setDepth(1001);
        
        // Fade out the flash quickly
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                flash.destroy();
            }
        });
        
        // Push player back a couple steps
        const pushDirection = lastDirection;
        let pushX = 0;
        let pushY = 0;
        
        if (pushDirection === 'up') {
            pushY = 64; // Push down
        } else if (pushDirection === 'down') {
            pushY = -64; // Push up
        } else if (pushDirection === 'left') {
            pushX = 64; // Push right
        } else if (pushDirection === 'right') {
            pushX = -64; // Push left
        } else {
            // Default: push down
            pushY = 64;
        }
        
        this.tweens.add({
            targets: this.player,
            x: this.player.x + pushX,
            y: this.player.y + pushY,
            duration: 300,
            ease: 'Power2'
        });
        
        // After flash and push, show first dialogue
        this.time.delayedCall(400, () => {
            this.showCoffinDialogue1();
        });
    }
    
    showCoffinDialogue1() {
        // First dialogue: "Is that Connor?!"
        const dialogue = createDialogueBox(this, 'Is that Connor?!');
        this.coffinDialogue1Box = dialogue.box;
        this.coffinDialogue1Text = dialogue.text;
        
        this.time.delayedCall(50, () => {
            this.canCloseCoffinDialogue1 = true;
        });
        
        const touchControls = window.touchControls || {};
        this.lastCoffinDialogue1A = touchControls.a || false;
        this.lastCoffinDialogue1B = touchControls.b || false;
        
        const closeDialogue = () => {
            if (!this.canCloseCoffinDialogue1) {
                this.lastCoffinDialogue1A = touchControls.a || false;
                this.lastCoffinDialogue1B = touchControls.b || false;
                return;
            }
            
            const aPressed = (touchControls.a && !this.lastCoffinDialogue1A);
            const bPressed = (touchControls.b && !this.lastCoffinDialogue1B);
            const spacePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aPressed || bPressed || spacePressed) {
                this.buttonSound.play();
                
                // Clean up first dialogue
                if (this.coffinDialogue1Box && this.coffinDialogue1Box.scene) {
                    this.coffinDialogue1Box.destroy();
                }
                if (this.coffinDialogue1Text && this.coffinDialogue1Text.scene) {
                    this.coffinDialogue1Text.destroy();
                }
                
                this.events.off('update', closeDialogue);
                
                // Re-enable player movement immediately
                this.cinematicPlaying = false;
                
                // Auto-save progress
                this.autoSaveProgress();
            }
            
            this.lastCoffinDialogue1A = touchControls.a || false;
            this.lastCoffinDialogue1B = touchControls.b || false;
        };
        
        this.events.on('update', closeDialogue);
    }
    
    showSimpleDialogue(text, dialogueKey, isItalic = false) {
        // Generic dialogue display for simple interactions
        this.cinematicPlaying = true;
        this.player.setVelocity(0);
        
        // Create dialogue with optional italic styling
        const textStyle = isItalic ? 'italic' : 'normal';
        const dialogue = createDialogueBox(this, text);
        
        // Override text style for italic if needed
        if (isItalic && dialogue.text) {
            dialogue.text.setFontStyle(textStyle);
        }
        
        this[dialogueKey + 'Box'] = dialogue.box;
        this[dialogueKey + 'Text'] = dialogue.text;
        
        // Very short wait to prevent same button press from closing immediately
        this.time.delayedCall(50, () => {
            this[dialogueKey + 'CanClose'] = true;
        });
        
        const touchControls = window.touchControls || {};
        this[dialogueKey + 'LastA'] = touchControls.a || false;
        this[dialogueKey + 'LastB'] = touchControls.b || false;
        
        // Close handler
        const closeDialogue = () => {
            if (!this[dialogueKey + 'CanClose']) {
                this[dialogueKey + 'LastA'] = touchControls.a || false;
                this[dialogueKey + 'LastB'] = touchControls.b || false;
                return;
            }
            
            const aPressed = (touchControls.a && !this[dialogueKey + 'LastA']);
            const bPressed = (touchControls.b && !this[dialogueKey + 'LastB']);
            const spacePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aPressed || bPressed || spacePressed) {
                this.buttonSound.play();
                
                // Clean up dialogue
                if (this[dialogueKey + 'Box'] && this[dialogueKey + 'Box'].scene) {
                    this[dialogueKey + 'Box'].destroy();
                }
                if (this[dialogueKey + 'Text'] && this[dialogueKey + 'Text'].scene) {
                    this[dialogueKey + 'Text'].destroy();
                }
                
                // Re-enable player movement
                this.cinematicPlaying = false;
                
                this.events.off('update', closeDialogue);
            }
            
            this[dialogueKey + 'LastA'] = touchControls.a || false;
            this[dialogueKey + 'LastB'] = touchControls.b || false;
        };
        
        this.events.on('update', closeDialogue);
    }

    update() {
        // Update Magnus follower AI FIRST - runs even during cutscenes/dialogues
        window.updateMagnusAI(this);
        
        // Don't update if cinematic is playing
        if (this.cinematicPlaying || this.simpleDialogueOpen) return;
        
        if (!this.player) return;
        
        this.player.setVelocity(0);
        
        // Check keyboard OR touch controls
        const touchControls = window.touchControls || {};
        
        // Track button states BEFORE checking presses
        const lastA = this.lastAPressed || false;
        this.lastAPressed = touchControls.a || false;
        
        const leftPressed = this.cursors.left.isDown || touchControls.left;
        const rightPressed = this.cursors.right.isDown || touchControls.right;
        const upPressed = this.cursors.up.isDown || touchControls.up;
        const downPressed = this.cursors.down.isDown || touchControls.down;
        const aPressed = Phaser.Input.Keyboard.JustDown(this.actionKey) || (touchControls.a && !lastA);
        
        // Manually check overlaps every frame (more reliable than callbacks)
        // Spider zone uses callback for first-time trigger, keep that separate
        if (this.powerZone) {
            this.nearPower = this.physics.overlap(this.player, this.powerZone);
        }
        if (this.railZone) {
            this.nearRail = this.physics.overlap(this.player, this.railZone);
        }
        if (this.bonesZone) {
            this.nearBones = this.physics.overlap(this.player, this.bonesZone);
        }
        if (this.djZone) {
            this.nearDJ = this.physics.overlap(this.player, this.djZone);
        }
        if (this.screenZone) {
            this.nearScreen = this.physics.overlap(this.player, this.screenZone);
        }
        if (this.tvZone) {
            this.nearTV = this.physics.overlap(this.player, this.tvZone);
        }
        if (this.coffinZone) {
            this.nearCoffin = this.physics.overlap(this.player, this.coffinZone);
        }
        
        // Check if near power switch and A is pressed
        if (this.nearPower && aPressed) {
            // Magnus must be currently summoned (not just previously summoned)
            if (this.summonedNPC && !window.triggeredEvents?.connorRoomPowerOn) {
                this.buttonSound.play();
                
                // Start power-on cinematic!
                this.playPowerOnCinematic();
            } else if (!this.summonedNPC && !window.triggeredEvents?.connorRoomPowerOn) {
                // No Magnus, can't approach (should have already run away)
                this.buttonSound.play();
                this.showSimpleDialogue("I can't get close to that spider...", 'power', false);
            }
        }
        // Rail interaction
        else if (this.nearRail && aPressed) {
            this.buttonSound.play();
            this.showSimpleDialogue('Riiiiiiiiiide that rail...', 'rail', true); // Italic text
        }
        // Bones interaction
        else if (this.nearBones && aPressed) {
            this.buttonSound.play();
            this.showSimpleDialogue('They headbanged too hard.', 'bones', false);
        }
        // DJ interaction - power dependent
        else if (this.nearDJ && aPressed) {
            this.buttonSound.play();
            if (!window.triggeredEvents?.connorRoomPowerOn) {
                this.showSimpleDialogue('The power appears to be off.', 'dj', false);
            } else {
                // TODO: Add powered DJ functionality later
                this.showSimpleDialogue('The DJ booth is ready!', 'dj', false);
            }
        }
        // Screen interaction - power dependent
        else if (this.nearScreen && aPressed) {
            this.buttonSound.play();
            this.showSimpleDialogue('The power appears to be off.', 'screen', false);
        }
        // TV interaction - power dependent
        else if (this.nearTV && aPressed) {
            this.buttonSound.play();
            this.showSimpleDialogue('The power appears to be off.', 'tv', false);
        }
        // Coffin interaction - reveal Connor
        else if (this.nearCoffin && aPressed && !window.triggeredEvents?.coffinOpened) {
            this.buttonSound.play();
            this.openCoffin();
        }
        
        // Movement
        if (leftPressed) {
            this.player.setVelocityX(-currentSpeed);
            this.player.anims.play('walk-left', true);
            setLastDirection('left');
            window.WitchIdleManager.onMovementStart();
        } else if (rightPressed) {
            this.player.setVelocityX(currentSpeed);
            this.player.anims.play('walk-right', true);
            setLastDirection('right');
            window.WitchIdleManager.onMovementStart();
        } else if (upPressed) {
            this.player.setVelocityY(-currentSpeed);
            this.player.anims.play('walk-up', true);
            setLastDirection('up');
            window.WitchIdleManager.onMovementStart();
        } else if (downPressed) {
            this.player.setVelocityY(currentSpeed);
            this.player.anims.play('walk-down', true);
            setLastDirection('down');
            window.WitchIdleManager.onMovementStart();
        } else {
            window.WitchIdleManager.onMovementStop();
            window.playIdleAnimation(this.player, lastDirection);
        }
        
        // Update Magnus checkpoint tracking
        window.updateMagnusCheckpoints(this);
    }
    
    playPowerOnCinematic() {
        console.log('Playing power-on cinematic!');
        
        // Disable player movement
        this.cinematicPlaying = true;
        this.player.setVelocity(0);
        
        // Stop scary music
        if (window.MusicManager.currentMusic && window.MusicManager.currentType === 'event') {
            window.MusicManager.stopAll();
        }
        
        // Make Magnus disappear immediately (he helped turn it on!)
        if (this.summonedNPC) {
            this.summonedNPC.destroy();
            this.summonedNPC = null;
            window.magnusSummonState = null;
        }
        if (this.magnusZone) {
            this.magnusZone.destroy();
            this.magnusZone = null;
        }
        
        // Create flash overlay for black/yellow flashing
        const flashOverlay = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width * 2,
            this.cameras.main.height * 2,
            0x000000
        );
        flashOverlay.setScrollFactor(0);
        flashOverlay.setDepth(2000);
        flashOverlay.setAlpha(0);
        
        // Flash sequence: black and yellow alternating
        const flashSequence = [
            { color: 0xFFFF00, duration: 150 }, // Yellow
            { color: 0x000000, duration: 150 }, // Black
            { color: 0xFFFF00, duration: 150 }, // Yellow
            { color: 0x000000, duration: 150 }, // Black
            { color: 0xFFFF00, duration: 150 }, // Yellow
            { color: 0x000000, duration: 150 }, // Black
        ];
        
        let currentFlash = 0;
        const doFlash = () => {
            if (currentFlash < flashSequence.length) {
                const flash = flashSequence[currentFlash];
                flashOverlay.setFillStyle(flash.color);
                flashOverlay.setAlpha(0.8);
                
                this.time.delayedCall(flash.duration, () => {
                    flashOverlay.setAlpha(0);
                    currentFlash++;
                    
                    if (currentFlash < flashSequence.length) {
                        this.time.delayedCall(50, doFlash);
                    } else {
                        // Flashing complete, transition to ConnorRoomScene2
                        this.transitionToConnorRoom2();
                    }
                });
            }
        };
        
        // Start flashing
        doFlash();
        
        // Mark power as turned on
        window.triggeredEvents.connorRoomPowerOn = true;
    }
    
    transitionToConnorRoom2() {
        console.log('Transitioning to ConnorRoomScene2 (powered on)');
        
        // Fade to black
        const blackOverlay = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width * 2,
            this.cameras.main.height * 2,
            0x000000
        );
        blackOverlay.setScrollFactor(0);
        blackOverlay.setDepth(2001);
        blackOverlay.setAlpha(0);
        
        this.tweens.add({
            targets: blackOverlay,
            alpha: 1,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // Switch to ConnorRoomScene2, passing player's current position
                this.scene.start('ConnorRoomScene2', { 
                    from: 'ConnorRoomScene',
                    playerPosition: { x: this.player.x, y: this.player.y }
                });
            }
        });
    }
}

// Connor Room Scene 2 - Powered On Version
class ConnorRoomScene2 extends Phaser.Scene {
    constructor() {
        super({ key: 'ConnorRoomScene2' });
        console.log('ConnorRoomScene2 constructor called!');
    }

    preload() {
        console.log('Loading Connor\'s room 2 assets...');
        
        // Load character sprites
        loadCharacterSprites(this);
        
        // Load all tilesets for connor_room2
        this.load.image('beach', 'tilesets/beach.png');
        this.load.image('conkortv', 'tilesets/conkortv.png');
        this.load.image('floors', 'tilesets/floors.png');
        this.load.image('generic', 'tilesets/generic.png');
        this.load.image('halloween', 'tilesets/halloween.png');
        this.load.image('laser', 'tilesets/laser.png');
        this.load.image('room_builder', 'tilesets/room_builder.png');
        this.load.image('tv', 'tilesets/tv.png');
        
        // Load the connor_room2 tilemap
        this.load.tilemapTiledJSON('connor_room2', 'maps/connor_room2.json');
        
        // Load audio - conkor.mp3 is large so we defer it to avoid blocking scene startup
        this.load.audio('buttonPress', 'sounds/button_press.mp3');
        this.load.audio('doorSound', 'sounds/door_sound.mp3');
        
        // Load NPC sprites (832x256 = 13 cols x 4 rows, 64x64 frames)
        // Connor: 1h_backslash.png for idle (all 13 cols), walk.png for cinematic walk
        this.load.spritesheet('connor-backslash', 'characters/connor/1h_backslash.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('connor-walk', 'characters/connor/walk.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('chris-idle', 'characters/chris/idle.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('skeleton-thrust', 'characters/skeleton/thrust.png', {
            frameWidth: 64,
            frameHeight: 64
        });
    }

    create() {
        console.log('Creating Connor\'s Room 2 (powered on)...');
        
        // Create the map
        const map = this.make.tilemap({ key: 'connor_room2' });
        this.map = map; // Store for animated tiles
        
        // Add tilesets
        const beachTileset = map.addTilesetImage('beach', 'beach');
        const conkortvTileset = map.addTilesetImage('conkortv', 'conkortv');
        const floorsTileset = map.addTilesetImage('floors', 'floors');
        const genericTileset = map.addTilesetImage('generic', 'generic');
        const halloweenTileset = map.addTilesetImage('halloween', 'halloween');
        const laserTileset = map.addTilesetImage('laser', 'laser');
        const roomBuilderTileset = map.addTilesetImage('room_builder', 'room_builder');
        const tvTileset = map.addTilesetImage('tv', 'tv');
        
        // Create layers in order - include all tilesets for each layer to be safe
        const allTilesets = [beachTileset, conkortvTileset, floorsTileset, genericTileset, halloweenTileset, laserTileset, roomBuilderTileset, tvTileset];
        
        const floorLayer = map.createLayer('floor', allTilesets);
        const wallLayer = map.createLayer('wall', allTilesets);
        const ladderLayer = map.createLayer('ladder', allTilesets);
        const bedLayer = map.createLayer('bed', allTilesets);
        const onFloorLayer = map.createLayer('on_floor', allTilesets);
        const miscLayer = map.createLayer('misc', allTilesets);
        const lasersLayer = map.createLayer('lasers', allTilesets);
        if (lasersLayer) {
            lasersLayer.setDepth(15); // Above player (depth 10)
        }
        const collisionLayer = map.createLayer('collision', allTilesets);
        
        // Set up animated tiles for laser layer
        this.animatedTiles = [];
        this.setupAnimatedTiles(map);
        
        // Set up collision
        if (collisionLayer) {
            collisionLayer.setCollisionByExclusion([-1]);
            collisionLayer.setVisible(false);
            this.collisionLayer = collisionLayer;
        }
        
        // Set world bounds
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        
        // Get object layer for spawn points and interactions
        const objectLayer = map.getObjectLayer('objects');
        
        // Get spawn position
        const spawn = window.getSpawnPosition('ConnorRoomScene2', objectLayer, 200, 300, this.scene.settings.data);
        
        // Create player
        this.player = this.physics.add.sprite(spawn.x, spawn.y, 'dacia-idle');
        this.player.setCollideWorldBounds(true);
        this.player.setSize(20, 20);
        this.player.setOffset(22, 44);
        this.player.setDepth(10);
        
        // Set up collision
        if (this.collisionLayer) {
            this.physics.add.collider(this.player, this.collisionLayer);
        }
        
        // Add collision objects from the object-based collision layer
        // connor_room2 has two layers named 'collision' - tilelayer (index 7) and objectgroup (index 8)
        // Phaser's getObjectLayer finds the objectgroup one
        const collisionObjectsLayer = map.getObjectLayer('collision');
        if (collisionObjectsLayer) {
            collisionObjectsLayer.objects.forEach(obj => {
                const collisionRect = this.add.rectangle(obj.x, obj.y, obj.width, obj.height);
                collisionRect.setOrigin(0, 0);
                this.physics.add.existing(collisionRect, true);
                this.physics.add.collider(this.player, collisionRect);
            });
        }
        
        // Camera
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        
        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.actionKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // Audio
        this.buttonSound = this.sound.add('buttonPress', { volume: 0.5 });
        this.doorSound = this.sound.add('doorSound', { volume: 0.6 });
        
        // Create animations
        createAnimations(this);
        
        // Set up interactions from object layer
        if (objectLayer) {
            // Door to apartment
            const door = objectLayer.objects.find(obj => obj.name === 'door_to_apartment');
            if (door) {
                this.doorZone = this.add.zone(door.x, door.y, door.width || 32, door.height || 32);
                this.doorZone.setOrigin(0, 0);
                this.physics.add.existing(this.doorZone, true);
                this.nearDoor = false;
                this.doorTriggered = false;
                
                this.physics.add.overlap(this.player, this.doorZone, () => {
                    this.nearDoor = true;
                    if (!this.doorTriggered) {
                        this.doorTriggered = true;
                        this.doorSound.play();
                        
                        // Stop conkor music when leaving
                        window.MusicManager.stopAll();
                        
                        // End MDMA effect if active
                        if (this.mdmaEffectActive) {
                            this.endMDMAEffect();
                        }
                        
                        this.time.delayedCall(200, () => {
                            this.scene.start('ApartmentScene', { from: 'ConnorRoomScene2' });
                        });
                    }
                }, null, this);
            }
            
            // DJ
            const dj = objectLayer.objects.find(obj => obj.name === 'dj');
            if (dj) {
                this.djZone = this.add.zone(dj.x, dj.y, dj.width || 32, dj.height || 32);
                this.djZone.setOrigin(0, 0);
                this.physics.add.existing(this.djZone, true);
                this.nearDJ = false;
            }
            
            // Screen
            const screen = objectLayer.objects.find(obj => obj.name === 'screen');
            if (screen) {
                this.screenZone = this.add.zone(screen.x, screen.y, screen.width || 32, screen.height || 32);
                this.screenZone.setOrigin(0, 0);
                this.physics.add.existing(this.screenZone, true);
                this.nearScreen = false;
            }
            
            // Bar
            const bar = objectLayer.objects.find(obj => obj.name === 'bar');
            if (bar) {
                this.barZone = this.add.zone(bar.x, bar.y, bar.width || 32, bar.height || 32);
                this.barZone.setOrigin(0, 0);
                this.physics.add.existing(this.barZone, true);
                this.nearBar = false;
            }
            
            // Connor NPC - uses 1h_backslash.png, defaults facing down
            const connorObj = objectLayer.objects.find(obj => obj.name === 'connornpc');
            if (connorObj) {
                // Create Connor NPC idle animations (1h_backslash: 13 cols x 4 rows, all 13 frames used)
                if (!this.anims.exists('connor-idle-up')) {
                    this.anims.create({ key: 'connor-idle-up', frames: this.anims.generateFrameNumbers('connor-backslash', { start: 0, end: 12 }), frameRate: 8, repeat: -1 });
                    this.anims.create({ key: 'connor-idle-left', frames: this.anims.generateFrameNumbers('connor-backslash', { start: 13, end: 25 }), frameRate: 8, repeat: -1 });
                    this.anims.create({ key: 'connor-idle-down', frames: this.anims.generateFrameNumbers('connor-backslash', { start: 26, end: 38 }), frameRate: 8, repeat: -1 });
                    this.anims.create({ key: 'connor-idle-right', frames: this.anims.generateFrameNumbers('connor-backslash', { start: 39, end: 51 }), frameRate: 8, repeat: -1 });
                }
                // Connor walk animations for cinematic
                if (!this.anims.exists('connor-walk-up')) {
                    this.anims.create({ key: 'connor-walk-up', frames: this.anims.generateFrameNumbers('connor-walk', { start: 0, end: 8 }), frameRate: 10, repeat: -1 });
                    this.anims.create({ key: 'connor-walk-left', frames: this.anims.generateFrameNumbers('connor-walk', { start: 13, end: 21 }), frameRate: 10, repeat: -1 });
                    this.anims.create({ key: 'connor-walk-down', frames: this.anims.generateFrameNumbers('connor-walk', { start: 26, end: 34 }), frameRate: 10, repeat: -1 });
                    this.anims.create({ key: 'connor-walk-right', frames: this.anims.generateFrameNumbers('connor-walk', { start: 39, end: 47 }), frameRate: 10, repeat: -1 });
                }
                
                this.connorNPC = this.physics.add.sprite(connorObj.x, connorObj.y, 'connor-backslash');
                this.connorNPC.body.setImmovable(true);
                this.connorNPC.body.setSize(20, 20);
                this.connorNPC.body.setOffset(22, 38);
                this.connorNPC.setDepth(8);
                this.connorNPC.defaultDirection = 'down';
                this.connorNPC.anims.play('connor-idle-down', true);
                
                // Store the connornpc map position for cinematic walk target
                this.connorDJPosition = { x: connorObj.x, y: connorObj.y };
                
                this.connorZone = this.add.zone(connorObj.x, connorObj.y, 80, 80);
                this.connorZone.setOrigin(0.5, 0.5);
                this.physics.add.existing(this.connorZone, true);
                this.nearConnor = false;
                
                this.physics.add.collider(this.player, this.connorNPC);
            }
            
            // Chris NPC - uses idle.png, defaults facing up
            const chrisObj = objectLayer.objects.find(obj => obj.name === 'chrisnpc');
            if (chrisObj) {
                // Create Chris NPC idle animations (idle sheet: 13 cols x 4 rows)
                // idle typically has 2 frames per direction
                if (!this.anims.exists('chris-idle-up')) {
                    this.anims.create({ key: 'chris-idle-up', frames: this.anims.generateFrameNumbers('chris-idle', { start: 0, end: 1 }), frameRate: 3, repeat: -1 });
                    this.anims.create({ key: 'chris-idle-left', frames: this.anims.generateFrameNumbers('chris-idle', { start: 13, end: 14 }), frameRate: 3, repeat: -1 });
                    this.anims.create({ key: 'chris-idle-down', frames: this.anims.generateFrameNumbers('chris-idle', { start: 26, end: 27 }), frameRate: 3, repeat: -1 });
                    this.anims.create({ key: 'chris-idle-right', frames: this.anims.generateFrameNumbers('chris-idle', { start: 39, end: 40 }), frameRate: 3, repeat: -1 });
                }
                
                this.chrisNPC = this.physics.add.sprite(chrisObj.x, chrisObj.y, 'chris-idle');
                this.chrisNPC.body.setImmovable(true);
                this.chrisNPC.body.setSize(20, 20);
                this.chrisNPC.body.setOffset(22, 38);
                this.chrisNPC.setDepth(8);
                this.chrisNPC.defaultDirection = 'up';
                this.chrisNPC.anims.play('chris-idle-up', true);
                
                this.chrisZone = this.add.zone(chrisObj.x, chrisObj.y, 80, 80);
                this.chrisZone.setOrigin(0.5, 0.5);
                this.physics.add.existing(this.chrisZone, true);
                this.nearChris = false;
                
                this.physics.add.collider(this.player, this.chrisNPC);
            }
            
            // Skeleton NPC (lastnpc) - uses thrust.png, defaults facing up
            const skeletonObj = objectLayer.objects.find(obj => obj.name === 'lastnpc');
            if (skeletonObj) {
                // Create Skeleton NPC idle animations (thrust sheet: 13 cols x 4 rows)
                // thrust typically has 8 frames per direction
                if (!this.anims.exists('skeleton-idle-up')) {
                    this.anims.create({ key: 'skeleton-idle-up', frames: this.anims.generateFrameNumbers('skeleton-thrust', { start: 0, end: 7 }), frameRate: 6, repeat: -1 });
                    this.anims.create({ key: 'skeleton-idle-left', frames: this.anims.generateFrameNumbers('skeleton-thrust', { start: 13, end: 20 }), frameRate: 6, repeat: -1 });
                    this.anims.create({ key: 'skeleton-idle-down', frames: this.anims.generateFrameNumbers('skeleton-thrust', { start: 26, end: 33 }), frameRate: 6, repeat: -1 });
                    this.anims.create({ key: 'skeleton-idle-right', frames: this.anims.generateFrameNumbers('skeleton-thrust', { start: 39, end: 46 }), frameRate: 6, repeat: -1 });
                }
                
                this.skeletonNPC = this.physics.add.sprite(skeletonObj.x, skeletonObj.y, 'skeleton-thrust');
                this.skeletonNPC.body.setImmovable(true);
                this.skeletonNPC.body.setSize(20, 20);
                this.skeletonNPC.body.setOffset(22, 38);
                this.skeletonNPC.setDepth(8);
                this.skeletonNPC.defaultDirection = 'up';
                this.skeletonNPC.anims.play('skeleton-idle-up', true);
                
                this.skeletonZone = this.add.zone(skeletonObj.x, skeletonObj.y, 80, 80);
                this.skeletonZone.setOrigin(0.5, 0.5);
                this.physics.add.existing(this.skeletonZone, true);
                this.nearSkeleton = false;
                
                this.physics.add.collider(this.player, this.skeletonNPC);
            }
        }
        
        // Initialize Magnus summon state
        this.summonedNPC = null;
        this.summonTimer = null;
        this.lastRecordedPlayerPosition = null;
        this.magnusTargetPosition = null;
        
        // Check if Magnus should be active from previous scene
        checkAndRestoreMagnus(this);
        
        // Initialize cinematic flag
        this.cinematicPlaying = false;
        this.conkorLoaded = false;
        
        console.log('Connor\'s room 2 created!');
        
        // Begin loading conkor.mp3 in the background (large file - don't block scene)
        this.loadConkorInBackground();
        
        // Check where we're coming from
        const fromScene = this.scene.settings.data?.from;
        
        // If coming from apartment (return visit), start music immediately
        if (fromScene === 'ApartmentScene') {
            this.cinematicPlaying = false;
            this.startConkorWhenReady();
        }
        // If coming from cinematic (ConnorRoomScene power-on), play wakeup cinematic
        else if (fromScene === 'ConnorRoomScene') {
            this.cinematicPlaying = true;
            this.playWakeupCinematic();
        } else {
            // Default (reload): enable movement, start music
            this.cinematicPlaying = false;
            this.startConkorWhenReady();
        }
        
        // Autosave (delayed to not interfere with cinematic)
        this.time.delayedCall(2500, () => {
            window.saveGame(this);
        });
    }
    
    // Animated tiles system - parses Tiled animation data and swaps tile indices
    setupAnimatedTiles(map) {
        this.animatedTiles = [];
        
        // Find all tilesets with animation data
        const mapData = map.tilesets;
        for (const tileset of mapData) {
            const tileData = tileset.tileData;
            if (!tileData) continue;
            
            for (const tileIdStr in tileData) {
                const tile = tileData[tileIdStr];
                if (!tile.animation || tile.animation.length === 0) continue;
                
                const localId = parseInt(tileIdStr);
                const firstGid = tileset.firstgid;
                const globalId = firstGid + localId;
                
                // Build animation frame list (global tile IDs)
                const frames = tile.animation.map(frame => ({
                    tileId: firstGid + frame.tileid,
                    duration: frame.duration
                }));
                
                this.animatedTiles.push({
                    globalId: globalId,
                    frames: frames,
                    currentFrame: 0,
                    elapsed: 0
                });
            }
        }
        
        console.log(`Set up ${this.animatedTiles.length} animated tile definitions`);
    }
    
    updateAnimatedTiles(delta) {
        if (!this.animatedTiles || this.animatedTiles.length === 0) return;
        
        const map = this.map;
        if (!map) return;
        
        for (const anim of this.animatedTiles) {
            anim.elapsed += delta;
            
            const currentFrameData = anim.frames[anim.currentFrame];
            if (anim.elapsed >= currentFrameData.duration) {
                anim.elapsed -= currentFrameData.duration;
                anim.currentFrame = (anim.currentFrame + 1) % anim.frames.length;
                
                const newTileId = anim.frames[anim.currentFrame].tileId;
                
                // Update all tiles in all layers that use this animation's base tile
                for (const layer of map.layers) {
                    const tilemapLayer = layer.tilemapLayer;
                    if (!tilemapLayer) continue;
                    
                    tilemapLayer.forEachTile(tile => {
                        if (tile && tile.index === anim.globalId) {
                            tile.index = newTileId;
                        }
                    });
                }
                
                // Update the globalId to track the current frame's tileId
                // so we can find these tiles again next frame
                anim.globalId = newTileId;
            }
        }
    }
    
    // Load conkor.mp3 in the background without blocking
    loadConkorInBackground() {
        if (this.sound.get('conkor') || this.cache.audio.exists('conkor')) {
            this.conkorLoaded = true;
            return;
        }
        
        this.load.audio('conkor', 'sounds/conkor.mp3');
        this.load.once('complete', () => {
            console.log('conkor.mp3 loaded in background!');
            this.conkorLoaded = true;
        });
        this.load.start();
    }
    
    // Start conkor music as soon as it's available
    startConkorWhenReady() {
        const tryPlay = () => {
            if (this.conkorLoaded || this.sound.get('conkor') || this.cache.audio.exists('conkor')) {
                if (!this.sound.get('conkor')) {
                    this.conkorMusic = this.sound.add('conkor', { volume: 0.3, loop: true });
                } else {
                    this.conkorMusic = this.sound.get('conkor');
                }
                if (!this.conkorMusic.isPlaying) {
                    window.MusicManager.play(this.conkorMusic, 'event');
                }
            } else {
                // Not loaded yet, try again in 200ms
                this.time.delayedCall(200, tryPlay);
            }
        };
        tryPlay();
    }
    
    // Wakeup cinematic - Dacia wakes up on the floor, Connor talks to her
    playWakeupCinematic() {
        console.log('Playing wakeup cinematic in ConnorRoomScene2');
        
        // Position player on the ground (near player_spawn, lying down)
        // Use up-facing sit animation frame 0 as "lying down"
        this.player.setTexture('dacia-sit', 0); // Row 0 (up-facing), first frame
        
        // Position Connor slightly to the right of his DJ spot, facing right (towards player)
        if (this.connorNPC && this.connorDJPosition) {
            this.connorNPC.setPosition(this.connorDJPosition.x + 50, this.connorDJPosition.y + 60);
            this.connorNPC.anims.play('connor-idle-right', true);
        }
        
        // Create black overlay for fade in
        const blackOverlay = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width * 2,
            this.cameras.main.height * 2,
            0x000000
        );
        blackOverlay.setScrollFactor(0);
        blackOverlay.setDepth(2000);
        blackOverlay.setAlpha(1);
        
        // Fade in from black over 2 seconds
        this.tweens.add({
            targets: blackOverlay,
            alpha: 0,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                blackOverlay.destroy();
                
                // After fade, play sit-up animation slowly
                // sit.png row 0 (up-facing) frames 0-2
                if (!this.anims.exists('sit-up')) {
                    this.anims.create({
                        key: 'sit-up',
                        frames: this.anims.generateFrameNumbers('dacia-sit', { start: 0, end: 2 }),
                        frameRate: 2, // Slow sit-up
                        repeat: 0
                    });
                }
                
                this.time.delayedCall(500, () => {
                    this.player.anims.play('sit-up', false);
                    
                    // After sit-up completes, start dialogue sequence
                    this.time.delayedCall(1800, () => {
                        this.wakeupDialogueStep1();
                    });
                });
            }
        });
    }
    
    // Dialogue step 1: Connor asks if you're okay (black border)
    wakeupDialogueStep1() {
        const dialogue = this.createBlackDialogueBox('Uhhh.. you good over there?');
        
        this.time.delayedCall(50, () => { this.canCloseWakeup1 = true; });
        
        const touchControls = window.touchControls || {};
        this.lastWakeup1A = touchControls.a || false;
        
        const closeDialogue = () => {
            if (!this.canCloseWakeup1) {
                this.lastWakeup1A = touchControls.a || false;
                return;
            }
            
            const aPressed = (touchControls.a && !this.lastWakeup1A) || Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aPressed) {
                this.buttonSound.play();
                if (dialogue.box && dialogue.box.scene) dialogue.box.destroy();
                if (dialogue.text && dialogue.text.scene) dialogue.text.destroy();
                this.events.off('update', closeDialogue);
                
                // Next dialogue
                this.wakeupDialogueStep2();
            }
            
            this.lastWakeup1A = touchControls.a || false;
        };
        
        this.events.on('update', closeDialogue);
    }
    
    // Dialogue step 2: Connor explains what happened
    wakeupDialogueStep2() {
        const dialogue = this.createBlackDialogueBox('You just ran up in the middle of my set and passed out!');
        
        this.time.delayedCall(50, () => { this.canCloseWakeup2 = true; });
        
        const touchControls = window.touchControls || {};
        this.lastWakeup2A = touchControls.a || false;
        
        const closeDialogue = () => {
            if (!this.canCloseWakeup2) {
                this.lastWakeup2A = touchControls.a || false;
                return;
            }
            
            const aPressed = (touchControls.a && !this.lastWakeup2A) || Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aPressed) {
                this.buttonSound.play();
                if (dialogue.box && dialogue.box.scene) dialogue.box.destroy();
                if (dialogue.text && dialogue.text.scene) dialogue.text.destroy();
                this.events.off('update', closeDialogue);
                
                // Next dialogue
                this.wakeupDialogueStep3();
            }
            
            this.lastWakeup2A = touchControls.a || false;
        };
        
        this.events.on('update', closeDialogue);
    }
    
    // Dialogue step 3: Connor goes back to his set
    wakeupDialogueStep3() {
        const dialogue = this.createBlackDialogueBox('Well if you say so.. check out these doubles!');
        
        this.time.delayedCall(50, () => { this.canCloseWakeup3 = true; });
        
        const touchControls = window.touchControls || {};
        this.lastWakeup3A = touchControls.a || false;
        
        const closeDialogue = () => {
            if (!this.canCloseWakeup3) {
                this.lastWakeup3A = touchControls.a || false;
                return;
            }
            
            const aPressed = (touchControls.a && !this.lastWakeup3A) || Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aPressed) {
                this.buttonSound.play();
                if (dialogue.box && dialogue.box.scene) dialogue.box.destroy();
                if (dialogue.text && dialogue.text.scene) dialogue.text.destroy();
                this.events.off('update', closeDialogue);
                
                // Connor walks back to DJ position
                this.connorWalkToDJ();
            }
            
            this.lastWakeup3A = touchControls.a || false;
        };
        
        this.events.on('update', closeDialogue);
    }
    
    // Connor walks back to his DJ position, faces down, starts idle + conkor
    connorWalkToDJ() {
        if (!this.connorNPC || !this.connorDJPosition) {
            this.endWakeupCinematic();
            return;
        }
        
        const targetX = this.connorDJPosition.x;
        const targetY = this.connorDJPosition.y;
        
        // Determine walk direction
        const dx = targetX - this.connorNPC.x;
        const dy = targetY - this.connorNPC.y;
        
        // Walk horizontally first, then vertically (cardinal movement)
        const walkSpeed = 120;
        
        const walkPhase2 = () => {
            // Phase 2: walk vertically to target
            const dy2 = targetY - this.connorNPC.y;
            if (Math.abs(dy2) > 5) {
                if (dy2 < 0) {
                    this.connorNPC.body.setVelocity(0, -walkSpeed);
                    this.connorNPC.anims.play('connor-walk-up', true);
                } else {
                    this.connorNPC.body.setVelocity(0, walkSpeed);
                    this.connorNPC.anims.play('connor-walk-down', true);
                }
                
                const checkArrival = () => {
                    const remaining = Math.abs(targetY - this.connorNPC.y);
                    if (remaining < 8) {
                        this.connorNPC.body.setVelocity(0, 0);
                        this.connorNPC.setPosition(targetX, targetY);
                        this.events.off('update', checkArrival);
                        this.connorArriveAtDJ();
                    }
                };
                this.events.on('update', checkArrival);
            } else {
                this.connorNPC.setPosition(targetX, targetY);
                this.connorArriveAtDJ();
            }
        };
        
        // Phase 1: walk horizontally to target
        if (Math.abs(dx) > 5) {
            if (dx < 0) {
                this.connorNPC.body.setVelocity(-walkSpeed, 0);
                this.connorNPC.anims.play('connor-walk-left', true);
            } else {
                this.connorNPC.body.setVelocity(walkSpeed, 0);
                this.connorNPC.anims.play('connor-walk-right', true);
            }
            
            const checkPhase1 = () => {
                const remaining = Math.abs(targetX - this.connorNPC.x);
                if (remaining < 8) {
                    this.connorNPC.body.setVelocity(0, 0);
                    this.events.off('update', checkPhase1);
                    walkPhase2();
                }
            };
            this.events.on('update', checkPhase1);
        } else {
            walkPhase2();
        }
    }
    
    // Connor arrives at DJ spot - face down, start idle, play conkor
    connorArriveAtDJ() {
        this.connorNPC.body.setVelocity(0, 0);
        this.connorNPC.anims.play('connor-idle-down', true);
        
        // Start conkor music now
        this.startConkorWhenReady();
        
        // End cinematic - enable player movement
        this.endWakeupCinematic();
    }
    
    // End the wakeup cinematic
    endWakeupCinematic() {
        // Have player stand up properly
        window.playIdleAnimation(this.player, window.lastDirection || 'down');
        
        this.cinematicPlaying = false;
        console.log('Wakeup cinematic complete!');
        
        // Show congratulations message after a short pause
        this.time.delayedCall(1000, () => {
            this.showCongratulations();
        });
    }
    
    // Celebratory gold congratulations box
    showCongratulations() {
        this.cinematicPlaying = true;
        this.player.setVelocity(0);
        
        const cam = this.cameras.main;
        const boxWidth = Math.min(500, cam.width - 40);
        const boxHeight = 160;
        const boxX = cam.centerX;
        const boxY = cam.centerY;
        
        const graphics = this.add.graphics();
        graphics.setScrollFactor(0);
        graphics.setDepth(1500);
        
        // Outer glow shadow
        graphics.fillStyle(0xffd700, 0.2);
        graphics.fillRoundedRect(boxX - boxWidth/2 - 6, boxY - boxHeight/2 - 6, boxWidth + 12, boxHeight + 12, 10);
        
        // Gold border
        graphics.fillStyle(0xffd700, 1);
        graphics.fillRoundedRect(boxX - boxWidth/2, boxY - boxHeight/2, boxWidth, boxHeight, 8);
        
        // Inner gold gradient (darker gold inner)
        graphics.fillStyle(0xdaa520, 1);
        graphics.fillRoundedRect(boxX - boxWidth/2 + 4, boxY - boxHeight/2 + 4, boxWidth - 8, boxHeight - 8, 6);
        
        // Cream center
        graphics.fillStyle(0xfffef5, 1);
        graphics.fillRoundedRect(boxX - boxWidth/2 + 8, boxY - boxHeight/2 + 8, boxWidth - 16, boxHeight - 16, 4);
        
        // Gold star decorations in corners
        const starOffset = 20;
        graphics.fillStyle(0xffd700, 1);
        graphics.fillCircle(boxX - boxWidth/2 + starOffset, boxY - boxHeight/2 + starOffset, 5);
        graphics.fillCircle(boxX + boxWidth/2 - starOffset, boxY - boxHeight/2 + starOffset, 5);
        graphics.fillCircle(boxX - boxWidth/2 + starOffset, boxY + boxHeight/2 - starOffset, 5);
        graphics.fillCircle(boxX + boxWidth/2 - starOffset, boxY + boxHeight/2 - starOffset, 5);
        
        // Small diamond accents
        const dSize = 3;
        [boxX - boxWidth/4, boxX + boxWidth/4].forEach(dx => {
            graphics.fillStyle(0xdaa520, 1);
            graphics.fillCircle(dx, boxY - boxHeight/2 + 14, dSize);
            graphics.fillCircle(dx, boxY + boxHeight/2 - 14, dSize);
        });
        
        // Title text
        const titleText = this.add.text(boxX, boxY - 35, 'Congratulations!', {
            fontSize: '24px',
            fontFamily: 'Arial, sans-serif',
            color: '#b8860b',
            fontStyle: 'bold',
            align: 'center'
        });
        titleText.setOrigin(0.5);
        titleText.setScrollFactor(0);
        titleText.setDepth(1501);
        
        // Body text
        const bodyText = this.add.text(boxX, boxY + 15, "You finished this update's story!", {
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            color: '#333333',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: boxWidth - 60 }
        });
        bodyText.setOrigin(0.5);
        bodyText.setScrollFactor(0);
        bodyText.setDepth(1501);
        
        // Subtitle
        const subText = this.add.text(boxX, boxY + 50, 'Press A to continue exploring', {
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif',
            color: '#888888',
            align: 'center'
        });
        subText.setOrigin(0.5);
        subText.setScrollFactor(0);
        subText.setDepth(1501);
        
        // Gentle pulse animation on the title
        this.tweens.add({
            targets: titleText,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Close on A press
        const touchControls = window.touchControls || {};
        let lastA = touchControls.a || false;
        let canClose = false;
        
        this.time.delayedCall(500, () => { canClose = true; });
        
        const closeHandler = () => {
            if (!canClose) {
                lastA = touchControls.a || false;
                return;
            }
            
            const aPressed = (touchControls.a && !lastA) || Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aPressed) {
                this.buttonSound.play();
                graphics.destroy();
                titleText.destroy();
                bodyText.destroy();
                subText.destroy();
                this.cinematicPlaying = false;
                this.events.off('update', closeHandler);
            }
            
            lastA = touchControls.a || false;
        };
        
        this.events.on('update', closeHandler);
    }
    
    // Black-bordered dialogue box (for Connor speaking)
    createBlackDialogueBox(text) {
        const boxY = this.cameras.main.height - 70;
        const boxWidth = this.cameras.main.width - 100;
        const boxHeight = 80;
        
        const graphics = this.add.graphics();
        graphics.setScrollFactor(0);
        graphics.setDepth(999);
        
        // Shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(this.cameras.main.centerX - boxWidth/2 + 3, boxY - boxHeight/2 + 3, boxWidth, boxHeight, 4);
        
        // Black border
        graphics.fillStyle(0x333333, 1);
        graphics.fillRoundedRect(this.cameras.main.centerX - boxWidth/2, boxY - boxHeight/2, boxWidth, boxHeight, 4);
        
        // Dark cream inner background
        graphics.fillStyle(0xfff8f0, 1);
        graphics.fillRoundedRect(this.cameras.main.centerX - boxWidth/2 + 5, boxY - boxHeight/2 + 5, boxWidth - 10, boxHeight - 10, 3);
        
        // Black corner accents
        const cornerOffset = 12;
        graphics.fillStyle(0x444444, 1);
        graphics.fillCircle(this.cameras.main.centerX - boxWidth/2 + cornerOffset, boxY - boxHeight/2 + cornerOffset, 3);
        graphics.fillCircle(this.cameras.main.centerX + boxWidth/2 - cornerOffset, boxY - boxHeight/2 + cornerOffset, 3);
        graphics.fillCircle(this.cameras.main.centerX - boxWidth/2 + cornerOffset, boxY + boxHeight/2 - cornerOffset, 3);
        graphics.fillCircle(this.cameras.main.centerX + boxWidth/2 - cornerOffset, boxY + boxHeight/2 - cornerOffset, 3);
        
        const dialogueText = this.add.text(
            this.cameras.main.centerX,
            boxY,
            text,
            {
                fontSize: '17px',
                fontFamily: 'Arial, sans-serif',
                color: '#000000',
                fontStyle: 'bold',
                align: 'center',
                lineSpacing: 4,
                wordWrap: { width: boxWidth - 40 }
            }
        );
        dialogueText.setOrigin(0.5, 0.5);
        dialogueText.setScrollFactor(0);
        dialogueText.setDepth(1000);
        
        return { box: graphics, text: dialogueText };
    }
    
    // Magnus summon system
    summonMagnus(skipGreeting = false) {
        window.globalSummonMagnus(this, skipGreeting);
    }
    
    dismissMagnus() {
        window.globalDismissMagnus(this);
    }

    update(time, delta) {
        // Update animated tiles (always, even during cinematics)
        this.updateAnimatedTiles(delta);
        
        // Update Magnus AI first
        window.updateMagnusAI(this);
        
        if (!this.player || this.cinematicPlaying || this.simpleDialogueOpen || this.barMenuOpen) return;
        
        this.player.setVelocity(0);
        
        const touchControls = window.touchControls || {};
        const lastA = this.lastAPressed || false;
        this.lastAPressed = touchControls.a || false;
        
        const leftPressed = this.cursors.left.isDown || touchControls.left;
        const rightPressed = this.cursors.right.isDown || touchControls.right;
        const upPressed = this.cursors.up.isDown || touchControls.up;
        const downPressed = this.cursors.down.isDown || touchControls.down;
        const aPressed = Phaser.Input.Keyboard.JustDown(this.actionKey) || (touchControls.a && !lastA);
        
        // Check overlaps
        if (this.djZone) {
            this.nearDJ = this.physics.overlap(this.player, this.djZone);
        }
        if (this.screenZone) {
            this.nearScreen = this.physics.overlap(this.player, this.screenZone);
        }
        if (this.barZone) {
            this.nearBar = this.physics.overlap(this.player, this.barZone);
        }
        if (this.connorZone) {
            this.nearConnor = this.physics.overlap(this.player, this.connorZone);
        }
        if (this.chrisZone) {
            this.nearChris = this.physics.overlap(this.player, this.chrisZone);
        }
        if (this.skeletonZone) {
            this.nearSkeleton = this.physics.overlap(this.player, this.skeletonZone);
        }
        
        // Get current speed
        const currentSpeed = window.WitchIdleManager.isIdle ? 80 : 160;
        
        // Get and set last direction
        const getLastDirection = () => {
            return window.lastDirection || 'down';
        };
        const setLastDirection = (dir) => {
            window.lastDirection = dir;
        };
        const lastDirection = getLastDirection();
        
        // Interactions
        if (this.nearDJ && aPressed) {
            this.buttonSound.play();
            this.showSimpleDialogue('The DJ booth is ready!', 'dj', false);
        }
        else if (this.nearScreen && aPressed) {
            this.buttonSound.play();
            this.showSimpleDialogue('The screen is on!', 'screen', false);
        }
        else if (this.nearBar && aPressed) {
            this.buttonSound.play();
            this.showBarMenu();
        }
        else if (this.nearConnor && aPressed) {
            this.buttonSound.play();
            this.faceNPCTowardsPlayer(this.connorNPC, 'connor');
            this.showNPCDialogue('Uhhh Im kinda in the middle of something dude.', 'connor', this.connorNPC, 'connor');
        }
        else if (this.nearChris && aPressed) {
            this.buttonSound.play();
            this.faceNPCTowardsPlayer(this.chrisNPC, 'chris');
            this.showNPCDialogue("Taught this kid everything he knows", 'chris', this.chrisNPC, 'chris');
        }
        else if (this.nearSkeleton && aPressed) {
            this.buttonSound.play();
            this.faceNPCTowardsPlayer(this.skeletonNPC, 'skeleton');
            this.showNPCDialogue('Riiiiide that rail...', 'skeleton', this.skeletonNPC, 'skeleton');
        }
        
        // Movement
        if (leftPressed) {
            this.player.setVelocityX(-currentSpeed);
            this.player.anims.play('walk-left', true);
            setLastDirection('left');
            window.WitchIdleManager.onMovementStart();
        } else if (rightPressed) {
            this.player.setVelocityX(currentSpeed);
            this.player.anims.play('walk-right', true);
            setLastDirection('right');
            window.WitchIdleManager.onMovementStart();
        } else if (upPressed) {
            this.player.setVelocityY(-currentSpeed);
            this.player.anims.play('walk-up', true);
            setLastDirection('up');
            window.WitchIdleManager.onMovementStart();
        } else if (downPressed) {
            this.player.setVelocityY(currentSpeed);
            this.player.anims.play('walk-down', true);
            setLastDirection('down');
            window.WitchIdleManager.onMovementStart();
        } else {
            window.WitchIdleManager.onMovementStop();
            window.playIdleAnimation(this.player, lastDirection);
        }
        
        // Update Magnus checkpoints
        window.updateMagnusCheckpoints(this);
    }
    
    showBarMenu() {
        this.barMenuOpen = true;
        this.player.setVelocity(0);
        
        this.barSelectedIndex = 0;
        const barOptions = [
            { key: 'water', name: 'Water 💧' },
            { key: 'mdma', name: 'MDMA 💊' }
        ];
        
        // Create menu box styled like wardrobe/radio
        const boxWidth = Math.min(400, this.cameras.main.width - 60);
        const boxHeight = Math.min(250, this.cameras.main.height - 100);
        const boxX = this.cameras.main.centerX;
        const boxY = this.cameras.main.centerY;
        
        const graphics = this.add.graphics();
        graphics.setScrollFactor(0);
        graphics.setDepth(999);
        
        // Shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(boxX - boxWidth/2 + 3, boxY - boxHeight/2 + 3, boxWidth, boxHeight, 4);
        
        // Pink border
        graphics.fillStyle(0xf0a0c8, 1);
        graphics.fillRoundedRect(boxX - boxWidth/2, boxY - boxHeight/2, boxWidth, boxHeight, 4);
        
        // Cream background
        graphics.fillStyle(0xfff8f0, 1);
        graphics.fillRoundedRect(boxX - boxWidth/2 + 5, boxY - boxHeight/2 + 5, boxWidth - 10, boxHeight - 10, 3);
        
        // Corner accents
        const cornerOffset = 12;
        graphics.fillStyle(0xe891b8, 1);
        graphics.fillCircle(boxX - boxWidth/2 + cornerOffset, boxY - boxHeight/2 + cornerOffset, 3);
        graphics.fillCircle(boxX + boxWidth/2 - cornerOffset, boxY - boxHeight/2 + cornerOffset, 3);
        graphics.fillCircle(boxX - boxWidth/2 + cornerOffset, boxY + boxHeight/2 - cornerOffset, 3);
        graphics.fillCircle(boxX + boxWidth/2 - cornerOffset, boxY + boxHeight/2 - cornerOffset, 3);
        
        this.barMenuGraphics = graphics;
        
        // Title
        this.barMenuTitle = this.add.text(boxX, boxY - boxHeight/2 + 30, 'Bar Menu 🍸', {
            fontSize: '19px', color: '#000000', fontStyle: 'bold'
        });
        this.barMenuTitle.setOrigin(0.5);
        this.barMenuTitle.setScrollFactor(0);
        this.barMenuTitle.setDepth(1000);
        
        // Options
        this.barMenuTexts = [];
        barOptions.forEach((option, index) => {
            const yPos = boxY - 10 + (index * 45);
            const highlight = this.add.graphics();
            highlight.setScrollFactor(0);
            highlight.setDepth(999);
            
            const text = this.add.text(boxX, yPos, option.name, {
                fontSize: '17px', color: '#000000'
            });
            text.setOrigin(0.5);
            text.setScrollFactor(0);
            text.setDepth(1000);
            
            this.barMenuTexts.push({ text, highlight, key: option.key });
        });
        
        // Instructions
        this.barMenuInstructions = this.add.text(boxX, boxY + boxHeight/2 - 25, '↑↓ Select   A: Choose   B: Close', {
            fontSize: '11px', color: '#888888'
        });
        this.barMenuInstructions.setOrigin(0.5);
        this.barMenuInstructions.setScrollFactor(0);
        this.barMenuInstructions.setDepth(1000);
        
        this.updateBarMenuHighlight(boxX, boxWidth, boxY);
        
        // Input handler
        const touchControls = window.touchControls || {};
        this.lastBarA = touchControls.a || false;
        this.lastBarB = touchControls.b || false;
        this.lastBarUp = touchControls.up || false;
        this.lastBarDown = touchControls.down || false;
        
        const handleBarInput = () => {
            const aPressed = (touchControls.a && !this.lastBarA) || Phaser.Input.Keyboard.JustDown(this.actionKey);
            const bPressed = (touchControls.b && !this.lastBarB);
            const upPressed = (touchControls.up && !this.lastBarUp) || Phaser.Input.Keyboard.JustDown(this.cursors.up);
            const downPressed = (touchControls.down && !this.lastBarDown) || Phaser.Input.Keyboard.JustDown(this.cursors.down);
            
            if (upPressed) {
                this.barSelectedIndex = (this.barSelectedIndex - 1 + barOptions.length) % barOptions.length;
                this.updateBarMenuHighlight(boxX, boxWidth, boxY);
                this.buttonSound.play();
            } else if (downPressed) {
                this.barSelectedIndex = (this.barSelectedIndex + 1) % barOptions.length;
                this.updateBarMenuHighlight(boxX, boxWidth, boxY);
                this.buttonSound.play();
            } else if (aPressed) {
                this.buttonSound.play();
                const selected = barOptions[this.barSelectedIndex].key;
                this.closeBarMenu();
                this.events.off('update', handleBarInput);
                
                if (selected === 'water') {
                    this.drinkWater();
                } else if (selected === 'mdma') {
                    this.takeMDMA();
                }
            } else if (bPressed) {
                this.buttonSound.play();
                this.closeBarMenu();
                this.events.off('update', handleBarInput);
            }
            
            this.lastBarA = touchControls.a || false;
            this.lastBarB = touchControls.b || false;
            this.lastBarUp = touchControls.up || false;
            this.lastBarDown = touchControls.down || false;
        };
        
        this.events.on('update', handleBarInput);
    }
    
    updateBarMenuHighlight(boxX, boxWidth, boxY) {
        this.barMenuTexts.forEach((item, index) => {
            item.highlight.clear();
            if (index === this.barSelectedIndex) {
                item.highlight.fillStyle(0xffd700, 1);
                const yPos = boxY - 10 + (index * 45);
                item.highlight.fillRoundedRect(boxX - boxWidth/2 + 20, yPos - 18, boxWidth - 40, 36, 4);
            }
        });
    }
    
    closeBarMenu() {
        if (this.barMenuGraphics) this.barMenuGraphics.destroy();
        if (this.barMenuTitle) this.barMenuTitle.destroy();
        if (this.barMenuInstructions) this.barMenuInstructions.destroy();
        if (this.barMenuTexts) {
            this.barMenuTexts.forEach(item => {
                if (item.text) item.text.destroy();
                if (item.highlight) item.highlight.destroy();
            });
        }
        this.barMenuOpen = false;
    }
    
    drinkWater() {
        this.showSimpleDialogue('Delicious, feeling hydrated already!', 'bar', false);
    }
    
    takeMDMA() {
        console.log('Taking MDMA! Starting effects...');
        window.isMDMA = true;
        this.mdmaEffectActive = true;
        
        // 15% movespeed boost
        this.mdmaOriginalSpeed = currentSpeed;
        currentSpeed = Math.round(currentSpeed * 1.15);
        console.log('MDMA speed boost:', this.mdmaOriginalSpeed, '->', currentSpeed);
        
        const duration = 60000; // 60 seconds
        const cam = this.cameras.main;
        
        // Track intensity for hold-A boost (1.0 = normal, max 10.0)
        this.mdmaIntensity = 1.0;
        
        // --- BREATHING ZOOM (zoom IN then back to baseline - no zoom out below 1.0) ---
        this.mdmaBreathPhase = 0;
        this.mdmaBreathTimer = this.time.addEvent({
            delay: 16, // ~60fps
            repeat: -1,
            callback: () => {
                if (!this.mdmaEffectActive) return;
                // Advance phase based on intensity
                this.mdmaBreathPhase += (0.025 * this.mdmaIntensity);
                if (this.mdmaBreathPhase > Math.PI * 2) this.mdmaBreathPhase -= Math.PI * 2;
                
                // Only zoom in (sin gives 0 to 1 to 0) - never below baseline
                const breathAmount = 0.12 * this.mdmaIntensity;
                const zoomValue = 1.0 + Math.max(0, Math.sin(this.mdmaBreathPhase)) * breathAmount;
                cam.setZoom(zoomValue);
            }
        });
        
        // --- SMOOTH ROTATION (back and forth) ---
        this.mdmaRotationPhase = 0;
        this.mdmaRotationTimer = this.time.addEvent({
            delay: 16,
            repeat: -1,
            callback: () => {
                if (!this.mdmaEffectActive) return;
                this.mdmaRotationPhase += (0.015 * this.mdmaIntensity);
                if (this.mdmaRotationPhase > Math.PI * 2) this.mdmaRotationPhase -= Math.PI * 2;
                
                const rotAmount = 2.0 * this.mdmaIntensity;
                cam.setAngle(Math.sin(this.mdmaRotationPhase) * rotAmount);
            }
        });
        
        // --- COLOR LIGHT FLASHES (purple and green) ---
        // Use a single graphics overlay redrawn each flash cycle
        this.mdmaFlashGraphics = this.add.graphics();
        this.mdmaFlashGraphics.setScrollFactor(0);
        this.mdmaFlashGraphics.setDepth(997);
        this.mdmaFlashGraphics.setAlpha(0);
        
        const flashColors = [0x800080, 0x00ff00];
        this.mdmaFlashIndex = 0;
        this.mdmaFlashAlpha = 0;
        this.mdmaFlashRising = true;
        this.mdmaFlashElapsed = 0;
        this.mdmaFlashColors = flashColors;
        
        // Draw initial full-screen flash
        this.mdmaFlashGraphics.fillStyle(flashColors[0], 1);
        this.mdmaFlashGraphics.fillRect(0, 0, cam.width + 200, cam.height + 200);
        
        // --- SUBTLE CAMERA SHAKE ---
        this.mdmaShakeTimer = this.time.addEvent({
            delay: 120,
            repeat: -1,
            callback: () => {
                if (!this.mdmaEffectActive) return;
                const shakeIntensity = 0.002 * this.mdmaIntensity;
                cam.shake(120, shakeIntensity);
            }
        });
        
        // --- HOLD-A INTENSITY BOOST ---
        // 10% per second increase = 1.0 per 10 seconds = 10x at 10s hold
        // At 60fps: 1.0 / (10 * 60) = ~0.00167 per frame
        this.mdmaUpdateHandler = () => {
            if (!this.mdmaEffectActive) return;
            
            const touchControls = window.touchControls || {};
            const aHeld = touchControls.a || this.cursors?.space?.isDown;
            
            if (aHeld) {
                this.mdmaIntensity = Math.min(10.0, this.mdmaIntensity + 0.0167);
            } else {
                this.mdmaIntensity = Math.max(1.0, this.mdmaIntensity - 0.0167);
            }
            
            // Drive color flashes directly
            if (this.mdmaFlashGraphics) {
                const flashSpeed = 0.04 * this.mdmaIntensity; // How fast alpha pulses
                const maxAlpha = Math.min(0.5, 0.12 * this.mdmaIntensity);
                
                if (this.mdmaFlashRising) {
                    this.mdmaFlashAlpha += flashSpeed;
                    if (this.mdmaFlashAlpha >= maxAlpha) {
                        this.mdmaFlashAlpha = maxAlpha;
                        this.mdmaFlashRising = false;
                    }
                } else {
                    this.mdmaFlashAlpha -= flashSpeed;
                    if (this.mdmaFlashAlpha <= 0) {
                        this.mdmaFlashAlpha = 0;
                        this.mdmaFlashRising = true;
                        // Switch color on each new pulse
                        this.mdmaFlashIndex = (this.mdmaFlashIndex + 1) % this.mdmaFlashColors.length;
                        const cam = this.cameras.main;
                        this.mdmaFlashGraphics.clear();
                        this.mdmaFlashGraphics.fillStyle(this.mdmaFlashColors[this.mdmaFlashIndex], 1);
                        this.mdmaFlashGraphics.fillRect(0, 0, cam.width + 200, cam.height + 200);
                    }
                }
                
                this.mdmaFlashGraphics.setAlpha(this.mdmaFlashAlpha);
            }
        };
        this.events.on('update', this.mdmaUpdateHandler);
        
        // --- END EFFECT AFTER DURATION ---
        this.mdmaEndTimer = this.time.delayedCall(duration, () => {
            this.endMDMAEffect();
        });
    }
    
    endMDMAEffect() {
        console.log('MDMA effect wearing off...');
        this.mdmaEffectActive = false;
        window.isMDMA = false;
        this.mdmaIntensity = 1.0;
        
        // Restore original speed
        if (this.mdmaOriginalSpeed) {
            currentSpeed = this.mdmaOriginalSpeed;
            console.log('MDMA speed restored to:', currentSpeed);
        }
        
        // Clean up breathing zoom
        if (this.mdmaBreathTimer) {
            this.mdmaBreathTimer.destroy();
            this.mdmaBreathTimer = null;
        }
        this.cameras.main.setZoom(1.0);
        
        // Clean up rotation
        if (this.mdmaRotationTimer) {
            this.mdmaRotationTimer.destroy();
            this.mdmaRotationTimer = null;
        }
        this.cameras.main.setAngle(0);
        
        // Clean up flash graphics
        if (this.mdmaFlashGraphics) {
            this.mdmaFlashGraphics.destroy();
            this.mdmaFlashGraphics = null;
        }
        
        // Clean up shake timer
        if (this.mdmaShakeTimer) {
            this.mdmaShakeTimer.destroy();
            this.mdmaShakeTimer = null;
        }
        
        // Clean up update handler
        if (this.mdmaUpdateHandler) {
            this.events.off('update', this.mdmaUpdateHandler);
            this.mdmaUpdateHandler = null;
        }
        
        // Clean up end timer
        if (this.mdmaEndTimer) {
            this.mdmaEndTimer = null;
        }
        this.cameras.main.setAngle(0);
    }
    
    showSimpleDialogue(text, source, italic = false) {
        this.simpleDialogueOpen = true;
        this.player.setVelocity(0);
        
        const dialogue = createDialogueBox(this, text, italic);
        this.simpleDialogueBox = dialogue.box;
        this.simpleDialogueText = dialogue.text;
        
        const touchControls = window.touchControls || {};
        this.lastSimpleA = touchControls.a || false;
        
        const closeDialogue = () => {
            const aPressed = (touchControls.a && !this.lastSimpleA) || 
                             Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aPressed) {
                this.buttonSound.play();
                
                if (this.simpleDialogueBox && this.simpleDialogueBox.scene) {
                    this.simpleDialogueBox.destroy();
                }
                if (this.simpleDialogueText && this.simpleDialogueText.scene) {
                    this.simpleDialogueText.destroy();
                }
                
                this.simpleDialogueOpen = false;
                this.events.off('update', closeDialogue);
            }
            
            this.lastSimpleA = touchControls.a || false;
        };
        
        this.events.on('update', closeDialogue);
    }
    
    // Make an NPC face towards the player
    faceNPCTowardsPlayer(npc, animPrefix) {
        if (!npc || !this.player) return;
        
        const dx = this.player.x - npc.x;
        const dy = this.player.y - npc.y;
        
        let direction;
        if (Math.abs(dx) > Math.abs(dy)) {
            direction = dx > 0 ? 'right' : 'left';
        } else {
            direction = dy > 0 ? 'down' : 'up';
        }
        
        const animKey = `${animPrefix}-idle-${direction}`;
        if (npc.anims && this.anims.exists(animKey)) {
            npc.anims.play(animKey, true);
        }
    }
    
    // Show dialogue for an NPC, then return them to default direction when closed
    showNPCDialogue(text, source, npc, animPrefix) {
        this.simpleDialogueOpen = true;
        this.player.setVelocity(0);
        
        const dialogue = createDialogueBox(this, text);
        this.simpleDialogueBox = dialogue.box;
        this.simpleDialogueText = dialogue.text;
        
        const touchControls = window.touchControls || {};
        this.lastSimpleA = touchControls.a || false;
        
        const closeDialogue = () => {
            const aPressed = (touchControls.a && !this.lastSimpleA) || 
                             Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aPressed) {
                this.buttonSound.play();
                
                if (this.simpleDialogueBox && this.simpleDialogueBox.scene) {
                    this.simpleDialogueBox.destroy();
                }
                if (this.simpleDialogueText && this.simpleDialogueText.scene) {
                    this.simpleDialogueText.destroy();
                }
                
                // Return NPC to their default facing direction
                if (npc && npc.defaultDirection && animPrefix) {
                    const defaultAnim = `${animPrefix}-idle-${npc.defaultDirection}`;
                    if (npc.anims && this.anims.exists(defaultAnim)) {
                        npc.anims.play(defaultAnim, true);
                    }
                }
                
                this.simpleDialogueOpen = false;
                this.events.off('update', closeDialogue);
            }
            
            this.lastSimpleA = touchControls.a || false;
        };
        
        this.events.on('update', closeDialogue);
    }
}
console.log('ConnorRoomScene2 class defined!', typeof ConnorRoomScene2);

// Bathroom Scene
class BathroomScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BathroomScene' });
    }

    preload() {
        console.log('Loading bathroom assets...');
        
        // Load character sprites (in case this is the first scene)
        loadCharacterSprites(this);
        
        // Load all bathroom tilesets (don't assume any are preloaded)
        this.load.image('bathroom', 'tilesets/bathroom.png');
        this.load.image('grocery', 'tilesets/grocery.png');
        this.load.image('hospital', 'tilesets/hospital.png');
        this.load.image('japan', 'tilesets/japan.png');
        this.load.image('museum', 'tilesets/museum.png');
        this.load.image('room_builder', 'tilesets/room_builder.png');
        
        // Load sounds (in case this is the first scene)
        this.load.audio('buttonPress', 'sounds/button_press.mp3');
        this.load.audio('doorSound', 'sounds/door_sound.mp3');
        
        // Load bathroom map
        this.load.tilemapTiledJSON('bathroom', 'maps/dacia_bathroom.json');
    }

    create() {
        console.log('Creating bathroom...');
        
        const map = this.make.tilemap({ key: 'bathroom' });
        this.map = map; // Store map reference
        
        // Set physics world bounds
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        
        // Add all tilesets
        const allTilesets = [
            map.addTilesetImage('bathroom', 'bathroom'),
            map.addTilesetImage('grocery', 'grocery'),
            map.addTilesetImage('hospital', 'hospital'),
            map.addTilesetImage('japan', 'japan'),
            map.addTilesetImage('museum', 'museum'),
            map.addTilesetImage('room_builder', 'room_builder')
        ];
        
        // Create layers in order
        const floorLayer = map.createLayer('floor', allTilesets, 0, 0);
        const wallsLayer = map.createLayer('walls', allTilesets, 0, 0);
        const drawingLayer = map.createLayer('drawing', allTilesets, 0, 0);
        const stuffLayer = map.createLayer('stuff', allTilesets, 0, 0);
        const bathroomLayer = map.createLayer('bathroom', allTilesets, 0, 0);
        const topLayer = map.createLayer('top', allTilesets, 0, 0);
        const cdLayer = map.createLayer('cd', allTilesets, 0, 0); // EDM CD layer
        const duckLayer = map.createLayer('duck', allTilesets, 0, 0); // Duck layer
        const collisionLayer = map.createLayer('collision', allTilesets, 0, 0);
        
        // Hide cd layer if already collected
        if (cdLayer && window.cdLibrary && window.cdLibrary.edm.collected) {
            cdLayer.setVisible(false);
        }
        
        // Hide duck layer until Connor's room has been visited
        if (duckLayer && !window.triggeredEvents.visitedConnorRoomFirstTime) {
            duckLayer.setVisible(false);
        }
        
        // Hide and set collision
        if (collisionLayer) {
            collisionLayer.setVisible(false);
            collisionLayer.setCollisionByExclusion([-1]);
            this.collisionLayer = collisionLayer;
        }
        
        // Get spawn position (from save or default)
        const objectLayer = map.getObjectLayer('objects');
        const spawn = window.getSpawnPosition('BathroomScene', objectLayer, 200, 200, this.scene.settings.data);
        
        // Create player
        this.player = this.physics.add.sprite(spawn.x, spawn.y, 'dacia-idle');
        this.player.setCollideWorldBounds(true);
        this.player.setSize(20, 20);
        this.player.setOffset(22, 44);
        this.player.setDepth(10); // Set explicit depth so followers can render behind
        
        // Set up collision
        if (this.collisionLayer) {
            this.physics.add.collider(this.player, this.collisionLayer);
        }
        
        // Add collision objects
        const collisionObjectsLayer = map.getObjectLayer('collision_objects');
        if (collisionObjectsLayer) {
            collisionObjectsLayer.objects.forEach(obj => {
                // Skip collision object #8 if EDM CD has been collected
                if (obj.id === 8 && window.cdLibrary && window.cdLibrary.edm.collected) {
                    console.log('Skipping collision object #8 (CD collected)');
                    return;
                }
                
                const collisionRect = this.add.rectangle(obj.x, obj.y, obj.width, obj.height);
                collisionRect.setOrigin(0, 0);
                this.physics.add.existing(collisionRect, true);
                this.physics.add.collider(this.player, collisionRect);
                
                // Store reference to collision object #8 so we can remove it later
                if (obj.id === 8) {
                    this.cdCollisionObject = collisionRect;
                }
            });
        }
        
        // Camera
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        
        // Set up sounds
        this.buttonSound = this.sound.add('buttonPress', { volume: 0.5 });
        this.doorSound = this.sound.add('doorSound', { volume: 0.6 });
        
        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.actionKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // Set up interactive objects
        if (objectLayer) {
            // Door back to apartment
            const door = objectLayer.objects.find(obj => obj.name === 'door_to_apartment');
            if (door) {
                this.doorZone = this.add.zone(door.x, door.y, door.width || 32, door.height || 32);
                this.doorZone.setOrigin(0, 0);
                this.physics.add.existing(this.doorZone, true);
                
                this.doorTriggered = false;
                
                this.physics.add.overlap(this.player, this.doorZone, () => {
                    if (!this.doorTriggered) {
                        this.doorTriggered = true;
                        this.doorSound.play();
                        this.time.delayedCall(200, () => {
                            this.scene.start('ApartmentScene', { from: 'BathroomScene' });
                        });
                    }
                }, null, this);
            }
            
            // Toilet interaction
            const toilet = objectLayer.objects.find(obj => obj.name === 'toilet');
            if (toilet) {
                this.toiletZone = this.add.zone(toilet.x, toilet.y, toilet.width || 32, toilet.height || 32);
                this.toiletZone.setOrigin(0, 0);
                this.physics.add.existing(this.toiletZone, true);
                this.nearToilet = false;
                
                this.physics.add.overlap(this.player, this.toiletZone, () => {
                    this.nearToilet = true;
                }, null, this);
            }
            
            // Sink interaction
            const sink = objectLayer.objects.find(obj => obj.name === 'sink');
            if (sink) {
                this.sinkZone = this.add.zone(sink.x, sink.y, sink.width || 32, sink.height || 32);
                this.sinkZone.setOrigin(0, 0);
                this.physics.add.existing(this.sinkZone, true);
                this.nearSink = false;
                
                this.physics.add.overlap(this.player, this.sinkZone, () => {
                    this.nearSink = true;
                }, null, this);
            }
            
            // Duck interaction - only appears after visiting Connor's room
            const duck = objectLayer.objects.find(obj => obj.name === 'duck');
            if (duck && window.triggeredEvents.visitedConnorRoomFirstTime) {
                this.duckZone = this.add.zone(duck.x, duck.y, duck.width || 32, duck.height || 32);
                this.duckZone.setOrigin(0, 0);
                this.physics.add.existing(this.duckZone, true);
                this.nearDuck = false;
                
                this.physics.add.overlap(this.player, this.duckZone, () => {
                    this.nearDuck = true;
                }, null, this);
            }
            
            // EDM CD pickup
            const edmCD = objectLayer.objects.find(obj => obj.name === 'edm_cd');
            if (edmCD && !window.cdLibrary.edm.collected) {
                this.edmCDZone = this.add.zone(edmCD.x, edmCD.y, edmCD.width || 32, edmCD.height || 32);
                this.edmCDZone.setOrigin(0, 0);
                this.physics.add.existing(this.edmCDZone, true);
                this.nearEdmCD = false;
                
                this.physics.add.overlap(this.player, this.edmCDZone, () => {
                    this.nearEdmCD = true;
                }, null, this);
            }
        }
        
        // Initialize Magnus summon state
        this.summonedNPC = null;
        this.summonTimer = null;
        this.lastRecordedPlayerPosition = null;
        this.magnusTargetPosition = null;
        
        // Check if Magnus should be active from previous scene
        checkAndRestoreMagnus(this);
        
        console.log('Bathroom created!');
        // Autosave when entering scene
        this.time.delayedCall(500, () => {
            window.saveGame(this);
        });
    }
    
    // Magnus summon system - uses global function
    summonMagnus(skipGreeting = false) {
        window.globalSummonMagnus(this, skipGreeting);
    }
    
    dismissMagnus() {
        window.globalDismissMagnus(this);
    }
    
    update() {
        // Update Magnus follower AI FIRST
        window.updateMagnusAI(this);
        
        if (!this.player || this.simpleDialogueOpen || this.cdPickupOpen) return;
        
        this.player.setVelocity(0);
        
        // Check keyboard OR touch controls
        const touchControls = window.touchControls || {};
        
        // Track button states BEFORE checking presses
        const lastA = this.lastAPressed || false;
        this.lastAPressed = touchControls.a || false;
        
        const leftPressed = this.cursors.left.isDown || touchControls.left;
        const rightPressed = this.cursors.right.isDown || touchControls.right;
        const upPressed = this.cursors.up.isDown || touchControls.up;
        const downPressed = this.cursors.down.isDown || touchControls.down;
        const aPressed = Phaser.Input.Keyboard.JustDown(this.actionKey) || (touchControls.a && !lastA);
        
        // Manually check overlaps every frame (more reliable than callbacks)
        if (this.toiletZone) {
            this.nearToilet = this.physics.overlap(this.player, this.toiletZone);
        }
        if (this.sinkZone) {
            this.nearSink = this.physics.overlap(this.player, this.sinkZone);
        }
        if (this.duckZone) {
            this.nearDuck = this.physics.overlap(this.player, this.duckZone);
        }
        if (this.edmCDZone) {
            this.nearEdmCD = this.physics.overlap(this.player, this.edmCDZone);
        }
        
        // DEBUG: Log A button state
        if (aPressed) {
            console.log('[A Button Debug]', {
                scene: 'BathroomScene',
                aPressed: aPressed,
                'touchControls.a': touchControls.a,
                lastA: lastA,
                'space.isDown': this.cursors.space.isDown,
                'JustDown': Phaser.Input.Keyboard.JustDown(this.actionKey),
                simpleDialogueOpen: this.simpleDialogueOpen,
                cdPickupOpen: this.cdPickupOpen,
                nearToilet: this.nearToilet,
                nearSink: this.nearSink,
                nearDuck: this.nearDuck,
                nearEdmCD: this.nearEdmCD
            });
        }
        
        // Check interactions (use else-if for priority)
        if (this.nearToilet && aPressed) {
            console.log('[A Button] Toilet interaction triggered!');
            this.buttonSound.play();
            this.showSimpleDialogue("Lets keep this closed.. dont want any mice getting out!");
        }
        else if (this.nearSink && aPressed) {
            console.log('[A Button] Sink interaction triggered!');
            this.buttonSound.play();
            this.showSimpleDialogue("gotta wash up!");
        }
        else if (this.nearDuck && aPressed) {
            console.log('[A Button] Duck interaction triggered!');
            this.buttonSound.play();
            
            // If EDM CD has been collected and bathroom2 not yet unlocked, trigger the secret!
            if (window.cdLibrary?.edm?.collected && !window.triggeredEvents?.bathroom2Unlocked) {
                this.unlockBathroom2();
            } else {
                this.showSimpleDialogue("quack!");
            }
        }
        else if (this.nearEdmCD && aPressed && !window.cdLibrary.edm.collected) {
            console.log('[A Button] EDM CD pickup triggered!');
            this.buttonSound.play();
            this.pickupCD('edm');
        }
        
        // Movement
        if (leftPressed) {
            this.player.setVelocityX(-currentSpeed);
            this.player.anims.play('walk-left', true);
            setLastDirection('left');
            window.WitchIdleManager.onMovementStart();
        } else if (rightPressed) {
            this.player.setVelocityX(currentSpeed);
            this.player.anims.play('walk-right', true);
            setLastDirection('right');
            window.WitchIdleManager.onMovementStart();
        } else if (upPressed) {
            this.player.setVelocityY(-currentSpeed);
            this.player.anims.play('walk-up', true);
            setLastDirection('up');
            window.WitchIdleManager.onMovementStart();
        } else if (downPressed) {
            this.player.setVelocityY(currentSpeed);
            this.player.anims.play('walk-down', true);
            setLastDirection('down');
            window.WitchIdleManager.onMovementStart();
        } else {
            window.WitchIdleManager.onMovementStop();
            window.playIdleAnimation(this.player, lastDirection);
        }
        
        // Update Magnus checkpoint tracking
        window.updateMagnusCheckpoints(this);
    }
    
    showSimpleDialogue(message) {
        this.simpleDialogueOpen = true;
        this.player.setVelocity(0);
        
        const dialogue = createDialogueBox(this, message);
        this.simpleDialogueBox = dialogue.box;
        this.simpleDialogueText = dialogue.text;
        
        // Wait before allowing close
        this.time.delayedCall(50, () => {
            this.canCloseSimpleDialogue = true;
        });
        
        const touchControls = window.touchControls || {};
        this.lastSimpleA = touchControls.a || false;
        this.lastSimpleB = touchControls.b || false;
        
        // Close handler
        const closeDialogue = () => {
            if (!this.canCloseSimpleDialogue) {
                this.lastSimpleA = touchControls.a || false;
                this.lastSimpleB = touchControls.b || false;
                return;
            }
            
            const aPressed = (touchControls.a && !this.lastSimpleA);
            const bPressed = (touchControls.b && !this.lastSimpleB);
            const spacePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aPressed || bPressed || spacePressed) {
                this.buttonSound.play();
                
                if (this.simpleDialogueBox && this.simpleDialogueBox.scene) {
                    this.simpleDialogueBox.destroy();
                }
                if (this.simpleDialogueText && this.simpleDialogueText.scene) {
                    this.simpleDialogueText.destroy();
                }
                
                this.simpleDialogueOpen = false;
                this.events.off('update', closeDialogue);
            }
            
            this.lastSimpleA = touchControls.a || false;
            this.lastSimpleB = touchControls.b || false;
        };
        
        this.events.on('update', closeDialogue);
    }
    
    pickupCD(cdKey) {
        // Mark CD as collected
        window.cdLibrary[cdKey].collected = true;
        
        // Hide the CD tile layer
        const cdLayer = this.map.getLayer('cd');
        if (cdLayer && cdLayer.tilemapLayer) {
            cdLayer.tilemapLayer.setVisible(false);
        }
        
        // Destroy the interaction zone
        if (this.edmCDZone) {
            this.edmCDZone.destroy();
            this.edmCDZone = null;
        }
        
        // Destroy collision object #8 immediately so player can walk through
        if (this.cdCollisionObject) {
            this.cdCollisionObject.destroy();
            this.cdCollisionObject = null;
            console.log('Removed collision object #8');
        }
        
        // Show pickup message
        const cdName = window.cdLibrary[cdKey].name;
        this.cdPickupOpen = true;
        this.player.setVelocity(0);
        
        const dialogue = createDialogueBox(this, `You found CD: ${cdName}!`);
        this.cdPickupBox = dialogue.box;
        this.cdPickupText = dialogue.text;
        
        // Wait before allowing close
        this.time.delayedCall(50, () => {
            this.canCloseCDPickup = true;
        });
        
        const touchControls = window.touchControls || {};
        this.lastCDPickupA = touchControls.a || false;
        this.lastCDPickupB = touchControls.b || false;
        
        // Close handler
        const closeDialogue = () => {
            if (!this.canCloseCDPickup) {
                this.lastCDPickupA = touchControls.a || false;
                this.lastCDPickupB = touchControls.b || false;
                return;
            }
            
            const aPressed = (touchControls.a && !this.lastCDPickupA);
            const bPressed = (touchControls.b && !this.lastCDPickupB);
            const spacePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aPressed || bPressed || spacePressed) {
                this.buttonSound.play();
                
                // Clean up dialogue
                if (this.cdPickupBox && this.cdPickupBox.scene) {
                    this.cdPickupBox.destroy();
                }
                if (this.cdPickupText && this.cdPickupText.scene) {
                    this.cdPickupText.destroy();
                }
                
                // Re-enable player movement
                this.cdPickupOpen = false;
                
                this.events.off('update', closeDialogue);
            }
            
            this.lastCDPickupA = touchControls.a || false;
            this.lastCDPickupB = touchControls.b || false;
        };
        
        this.events.on('update', closeDialogue);
        
        // Save progress
        this.autoSaveProgress();
    }
    
    unlockBathroom2() {
        console.log('Unlocking Bathroom 2!');
        
        // Freeze player
        this.cinematicPlaying = true;
        this.player.setVelocity(0);
        
        // Show "quack!" first
        const dialogue = createDialogueBox(this, 'quack!');
        this.duckDialogueBox = dialogue.box;
        this.duckDialogueText = dialogue.text;
        
        const touchControls = window.touchControls || {};
        this.lastDuckA = touchControls.a || false;
        this.lastDuckB = touchControls.b || false;
        
        const closeDialogue = () => {
            const aPressed = (touchControls.a && !this.lastDuckA);
            const bPressed = (touchControls.b && !this.lastDuckB);
            const spacePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aPressed || bPressed || spacePressed) {
                this.buttonSound.play();
                
                // Clean up dialogue
                if (this.duckDialogueBox && this.duckDialogueBox.scene) {
                    this.duckDialogueBox.destroy();
                }
                if (this.duckDialogueText && this.duckDialogueText.scene) {
                    this.duckDialogueText.destroy();
                }
                
                this.events.off('update', closeDialogue);
                
                // Yellow flash and transition
                this.doYellowFlashTransition();
            }
            
            this.lastDuckA = touchControls.a || false;
            this.lastDuckB = touchControls.b || false;
        };
        
        this.events.on('update', closeDialogue);
    }
    
    doYellowFlashTransition() {
        // Create yellow flash
        const flash = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width * 2,
            this.cameras.main.height * 2,
            0xffff00,
            1
        );
        flash.setScrollFactor(0);
        flash.setDepth(2000);
        
        // Fade flash out
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                flash.destroy();
                
                // Mark as unlocked
                window.triggeredEvents.bathroom2Unlocked = true;
                
                // Save progress
                this.autoSaveProgress();
                
                // Transition to BathroomScene2
                this.scene.start('BathroomScene2', { 
                    from: 'BathroomScene',
                    spawnPoint: 'flash_spawn'
                });
            }
        });
    }
    
    autoSaveProgress() {
        if (!this.player) return;
        
        const saveData = {
            currentScene: this.scene.key,
            playerPosition: {
                x: this.player.x,
                y: this.player.y
            },
            lastDirection: window.lastDirection,
            triggeredEvents: window.triggeredEvents,
            cdCollection: window.cdLibrary
        };
        
        saveGameState(window.currentPlayer, saveData);
    }
}

// BathroomScene2 - Secret bathroom with door to laundry
class BathroomScene2 extends Phaser.Scene {
    constructor() {
        super({ key: 'BathroomScene2' });
    }

    preload() {
        // Load character sprites (in case this is the first scene)
        loadCharacterSprites(this);
        
        // Load same tilesets as regular bathroom
        this.load.image('bathroom', 'tilesets/bathroom.png');
        this.load.image('grocery', 'tilesets/grocery.png');
        this.load.image('hospital', 'tilesets/hospital.png');
        this.load.image('japan', 'tilesets/japan.png');
        this.load.image('museum', 'tilesets/museum.png');
        this.load.image('room_builder', 'tilesets/room_builder.png');
        
        // Load sounds (in case this is the first scene)
        this.load.audio('buttonPress', 'sounds/button_press.mp3');
        this.load.audio('doorSound', 'sounds/door_sound.mp3');
        
        this.load.tilemapTiledJSON('bathroom2', 'maps/dacia_bathroom2.json');
    }

    create(data) {
        const map = this.make.tilemap({ key: 'bathroom2' });
        this.map = map;
        
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        
        const allTilesets = [
            map.addTilesetImage('bathroom', 'bathroom'),
            map.addTilesetImage('grocery', 'grocery'),
            map.addTilesetImage('hospital', 'hospital'),
            map.addTilesetImage('japan', 'japan'),
            map.addTilesetImage('museum', 'museum'),
            map.addTilesetImage('room_builder', 'room_builder')
        ];
        
        const floorLayer = map.createLayer('floor', allTilesets, 0, 0);
        const wallsLayer = map.createLayer('walls', allTilesets, 0, 0);
        const drawingLayer = map.createLayer('drawing', allTilesets, 0, 0);
        const stuffLayer = map.createLayer('stuff', allTilesets, 0, 0);
        const bathroomLayer = map.createLayer('bathroom', allTilesets, 0, 0);
        const topLayer = map.createLayer('top', allTilesets, 0, 0);
        
        this.collisionLayer = map.createLayer('collision', allTilesets, 0, 0);
        this.collisionLayer.setCollisionByExclusion([-1]);
        this.collisionLayer.setVisible(false);
        
        const objectLayer = map.getObjectLayer('objects');
        
        // Get spawn position (from save or scene transition)
        const spawnPointName = data?.spawnPoint || 'new_spawn';
        const spawn = window.getSpawnPosition('BathroomScene2', objectLayer, 100, 100, this.scene.settings.data);
        
        // If coming from another scene, use specific spawn point
        if (data?.spawnPoint && objectLayer) {
            const playerSpawn = objectLayer.objects.find(obj => obj.name === spawnPointName) ||
                               objectLayer.objects.find(obj => obj.name === 'player_spawn') ||
                               objectLayer.objects.find(obj => obj.name === 'new_spawn') ||
                               objectLayer.objects.find(obj => obj.name === 'flash_spawn');
            
            if (playerSpawn) {
                spawn.x = playerSpawn.x;
                spawn.y = playerSpawn.y;
            }
        }
        
        this.player = this.physics.add.sprite(spawn.x, spawn.y, 'dacia-idle');
        this.player.setCollideWorldBounds(true);
        this.player.setSize(20, 20);
        this.player.setDepth(10); // Set explicit depth so followers can render behind
        this.player.setOffset(22, 44);
        
        if (this.collisionLayer) {
            this.physics.add.collider(this.player, this.collisionLayer);
        }
        
        // Collision objects (no CD collision object #8 in this version)
        const collisionObjectsLayer = map.getObjectLayer('collision_objects');
        if (collisionObjectsLayer) {
            collisionObjectsLayer.objects.forEach(obj => {
                const collisionRect = this.add.rectangle(obj.x, obj.y, obj.width, obj.height);
                collisionRect.setOrigin(0, 0);
                this.physics.add.existing(collisionRect, true);
                this.physics.add.collider(this.player, collisionRect);
            });
        }
        
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        
        this.buttonSound = this.sound.add('buttonPress', { volume: 0.5 });
        this.doorSound = this.sound.add('doorSound', { volume: 0.6 });
        
        this.cursors = this.input.keyboard.createCursorKeys();
        this.actionKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // Set up interactive objects
        if (objectLayer) {
            // Door back to apartment
            const doorToApartment = objectLayer.objects.find(obj => obj.name === 'door_to_apartment');
            if (doorToApartment) {
                this.apartmentDoorZone = this.add.zone(doorToApartment.x, doorToApartment.y, doorToApartment.width || 32, doorToApartment.height || 32);
                this.apartmentDoorZone.setOrigin(0, 0);
                this.physics.add.existing(this.apartmentDoorZone, true);
                this.apartmentDoorTriggered = false;
                
                this.physics.add.overlap(this.player, this.apartmentDoorZone, () => {
                    if (!this.apartmentDoorTriggered) {
                        this.apartmentDoorTriggered = true;
                        this.doorSound.play();
                        this.time.delayedCall(200, () => {
                            this.scene.start('ApartmentScene', { from: 'BathroomScene2' });
                        });
                    }
                }, null, this);
            }
            
            // Door to laundry
            const doorToLaundry = objectLayer.objects.find(obj => obj.name === 'door_to_laundry');
            if (doorToLaundry) {
                this.laundryDoorZone = this.add.zone(doorToLaundry.x, doorToLaundry.y, doorToLaundry.width || 32, doorToLaundry.height || 32);
                this.laundryDoorZone.setOrigin(0, 0);
                this.physics.add.existing(this.laundryDoorZone, true);
                this.laundryDoorTriggered = false;
                
                this.physics.add.overlap(this.player, this.laundryDoorZone, () => {
                    if (!this.laundryDoorTriggered) {
                        this.laundryDoorTriggered = true;
                        this.doorSound.play();
                        this.time.delayedCall(200, () => {
                            this.scene.start('LaundryScene', { from: 'BathroomScene2' });
                        });
                    }
                }, null, this);
            }
            
            // Toilet, sink, duck still exist for interactions
            const toilet = objectLayer.objects.find(obj => obj.name === 'toilet');
            if (toilet) {
                this.toiletZone = this.add.zone(toilet.x, toilet.y, toilet.width || 32, toilet.height || 32);
                this.toiletZone.setOrigin(0, 0);
                this.physics.add.existing(this.toiletZone, true);
                this.nearToilet = false;
            }
            
            const sink = objectLayer.objects.find(obj => obj.name === 'sink');
            if (sink) {
                this.sinkZone = this.add.zone(sink.x, sink.y, sink.width || 32, sink.height || 32);
                this.sinkZone.setOrigin(0, 0);
                this.physics.add.existing(this.sinkZone, true);
                this.nearSink = false;
            }
            
            // Duck - only appears after visiting Connor's room
            const duck = objectLayer.objects.find(obj => obj.name === 'duck');
            if (duck && window.triggeredEvents.visitedConnorRoomFirstTime) {
                this.duckZone = this.add.zone(duck.x, duck.y, duck.width || 32, duck.height || 32);
                this.duckZone.setOrigin(0, 0);
                this.physics.add.existing(this.duckZone, true);
                this.nearDuck = false;
            }
        }
        
        createAnimations(this);
        
        // Initialize Magnus summon state
        this.summonedNPC = null;
        this.summonTimer = null;
        this.lastRecordedPlayerPosition = null;
        this.magnusTargetPosition = null;
        
        // Check if Magnus should be active from previous scene
        checkAndRestoreMagnus(this);
        
        console.log('Bathroom 2 created!');
        
        // Autosave when entering scene
        this.time.delayedCall(500, () => {
            window.saveGame(this);
        });
    }

    // Magnus summon system - uses global function
    summonMagnus(skipGreeting = false) {
        window.globalSummonMagnus(this, skipGreeting);
    }
    
    dismissMagnus() {
        window.globalDismissMagnus(this);
    }

    update() {
        // Update Magnus follower AI FIRST
        window.updateMagnusAI(this);
        
        if (!this.player || this.simpleDialogueOpen) return;
        
        this.player.setVelocity(0);
        
        const touchControls = window.touchControls || {};
        const lastA = this.lastAPressed || false;
        this.lastAPressed = touchControls.a || false;
        
        const leftPressed = this.cursors.left.isDown || touchControls.left;
        const rightPressed = this.cursors.right.isDown || touchControls.right;
        const upPressed = this.cursors.up.isDown || touchControls.up;
        const downPressed = this.cursors.down.isDown || touchControls.down;
        const aPressed = Phaser.Input.Keyboard.JustDown(this.actionKey) || (touchControls.a && !lastA);
        
        // Manual overlap checks
        if (this.toiletZone) {
            this.nearToilet = this.physics.overlap(this.player, this.toiletZone);
        }
        if (this.sinkZone) {
            this.nearSink = this.physics.overlap(this.player, this.sinkZone);
        }
        if (this.duckZone) {
            this.nearDuck = this.physics.overlap(this.player, this.duckZone);
        }
        
        // Interactions
        if (this.nearToilet && aPressed) {
            this.buttonSound.play();
            this.showSimpleDialogue("Lets keep this closed.. dont want any mice getting out!");
        }
        else if (this.nearSink && aPressed) {
            this.buttonSound.play();
            this.showSimpleDialogue("gotta wash up!");
        }
        else if (this.nearDuck && aPressed) {
            this.buttonSound.play();
            this.showSimpleDialogue("quack!");
        }
        
        // Movement
        if (leftPressed) {
            this.player.setVelocityX(-currentSpeed);
            this.player.anims.play('walk-left', true);
            setLastDirection('left');
            window.WitchIdleManager.onMovementStart();
        } else if (rightPressed) {
            this.player.setVelocityX(currentSpeed);
            this.player.anims.play('walk-right', true);
            setLastDirection('right');
            window.WitchIdleManager.onMovementStart();
        } else if (upPressed) {
            this.player.setVelocityY(-currentSpeed);
            this.player.anims.play('walk-up', true);
            setLastDirection('up');
            window.WitchIdleManager.onMovementStart();
        } else if (downPressed) {
            this.player.setVelocityY(currentSpeed);
            this.player.anims.play('walk-down', true);
            setLastDirection('down');
            window.WitchIdleManager.onMovementStart();
        } else {
            window.WitchIdleManager.onMovementStop();
            window.playIdleAnimation(this.player, lastDirection);
        }
        
        // Update Magnus checkpoint tracking
        window.updateMagnusCheckpoints(this);
    }

    showSimpleDialogue(text) {
        this.simpleDialogueOpen = true;
        this.player.setVelocity(0);
        
        const dialogue = createDialogueBox(this, text);
        this.simpleDialogueBox = dialogue.box;
        this.simpleDialogueText = dialogue.text;
        
        const touchControls = window.touchControls || {};
        this.lastSimpleA = touchControls.a || false;
        this.lastSimpleB = touchControls.b || false;
        
        const closeDialogue = () => {
            const aPressed = (touchControls.a && !this.lastSimpleA);
            const bPressed = (touchControls.b && !this.lastSimpleB);
            const spacePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aPressed || bPressed || spacePressed) {
                this.buttonSound.play();
                
                if (this.simpleDialogueBox && this.simpleDialogueBox.scene) {
                    this.simpleDialogueBox.destroy();
                }
                if (this.simpleDialogueText && this.simpleDialogueText.scene) {
                    this.simpleDialogueText.destroy();
                }
                
                this.simpleDialogueOpen = false;
                this.events.off('update', closeDialogue);
            }
            
            this.lastSimpleA = touchControls.a || false;
            this.lastSimpleB = touchControls.b || false;
        };
        
        this.events.on('update', closeDialogue);
    }
    
    playNextTrack() {
        // CD playback continues in BathroomScene2
        if (!window.currentCD || !window.cdLibrary[window.currentCD]) {
            console.log('No CD to play in BathroomScene2');
            return;
        }
        
        const cd = window.cdLibrary[window.currentCD];
        
        if (window.currentTrackIndex >= cd.tracks.length) {
            // End of CD, loop back to start
            window.currentTrackIndex = 0;
        }
        
        const trackPath = cd.tracks[window.currentTrackIndex];
        console.log('BathroomScene2: Playing track', window.currentTrackIndex, ':', trackPath);
        
        // Check if track is already loaded
        if (!this.sound.get(trackPath)) {
            this.load.audio(trackPath, trackPath); // trackPath already contains full path
            this.load.once('complete', () => {
                const music = this.sound.add(trackPath, { volume: 0.5 });
                window.MusicManager.play(music, 'cd');
                
                music.once('complete', () => {
                    console.log('Track complete in BathroomScene2, advancing...');
                    window.currentTrackIndex++;
                    const activeScene = this.scene.manager.getScenes(true)[0];
                    if (activeScene && activeScene.playNextTrack) {
                        activeScene.playNextTrack();
                    }
                });
            });
            this.load.start();
        } else {
            const music = this.sound.get(trackPath);
            window.MusicManager.play(music, 'cd');
            
            music.once('complete', () => {
                console.log('Track complete in BathroomScene2, advancing...');
                window.currentTrackIndex++;
                const activeScene = this.scene.manager.getScenes(true)[0];
                if (activeScene && activeScene.playNextTrack) {
                    activeScene.playNextTrack();
                }
            });
        }
    }
}

// LaundryScene - Secret basement
class LaundryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LaundryScene' });
    }

    preload() {
        // Load character sprites (in case this is the first scene)
        loadCharacterSprites(this);
        
        this.load.image('bathroom', 'tilesets/bathroom.png');
        this.load.image('bedroom', 'tilesets/bedroom.png');
        this.load.image('graveyard', 'tilesets/graveyard.png');
        this.load.image('room_builder', 'tilesets/room_builder.png');
        this.load.image('terrain', 'tilesets/terrain.png');
        
        // Load sounds (in case this is the first scene)
        this.load.audio('buttonPress', 'sounds/button_press.mp3');
        this.load.audio('doorSound', 'sounds/door_sound.mp3');
        
        this.load.tilemapTiledJSON('laundry', 'maps/laundry.json');
    }

    create(data) {
        const map = this.make.tilemap({ key: 'laundry' });
        this.map = map;
        
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        
        const allTilesets = [
            map.addTilesetImage('bathroom', 'bathroom'),
            map.addTilesetImage('bedroom', 'bedroom'),
            map.addTilesetImage('graveyard', 'graveyard'),
            map.addTilesetImage('room_builder', 'room_builder'),
            map.addTilesetImage('terrain', 'terrain')
        ];
        
        const subfloorLayer = map.createLayer('subfloor', allTilesets, 0, 0);
        const floorLayer = map.createLayer('floor', allTilesets, 0, 0);
        const wallsLayer = map.createLayer('walls', allTilesets, 0, 0);
        const lightsLayer = map.createLayer('lights', allTilesets, 0, 0);
        const stuffLayer = map.createLayer('stuff', allTilesets, 0, 0);
        
        this.collisionLayer = map.createLayer('collision', allTilesets, 0, 0);
        this.collisionLayer.setCollisionByExclusion([-1]);
        this.collisionLayer.setVisible(false);
        
        const objectLayer = map.getObjectLayer('objects');
        
        // Get spawn position (from save or default)
        const spawn = window.getSpawnPosition('LaundryScene', objectLayer, 100, 100, this.scene.settings.data);
        
        // Create player
        this.player = this.physics.add.sprite(spawn.x, spawn.y, 'dacia-idle');
        this.player.setCollideWorldBounds(true);
        this.player.setSize(20, 20);
        this.player.setDepth(10); // Set explicit depth so followers can render behind
        this.player.setOffset(22, 44);
        
        if (this.collisionLayer) {
            this.physics.add.collider(this.player, this.collisionLayer);
        }
        
        // Collision objects
        const collisionObjectsLayer = map.getObjectLayer('collision_objects');
        if (collisionObjectsLayer) {
            collisionObjectsLayer.objects.forEach(obj => {
                const collisionRect = this.add.rectangle(obj.x, obj.y, obj.width, obj.height);
                collisionRect.setOrigin(0, 0);
                this.physics.add.existing(collisionRect, true);
                this.physics.add.collider(this.player, collisionRect);
            });
        }
        
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        
        this.buttonSound = this.sound.add('buttonPress', { volume: 0.5 });
        this.doorSound = this.sound.add('doorSound', { volume: 0.6 });
        
        this.cursors = this.input.keyboard.createCursorKeys();
        this.actionKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // Set up interactive objects
        if (objectLayer) {
            // Door back to bathroom2
            const doorToBathroom = objectLayer.objects.find(obj => obj.name === 'door_to_bathroom');
            if (doorToBathroom) {
                this.bathroomDoorZone = this.add.zone(doorToBathroom.x, doorToBathroom.y, doorToBathroom.width || 32, doorToBathroom.height || 32);
                this.bathroomDoorZone.setOrigin(0, 0);
                this.physics.add.existing(this.bathroomDoorZone, true);
                this.bathroomDoorTriggered = false;
                
                this.physics.add.overlap(this.player, this.bathroomDoorZone, () => {
                    if (!this.bathroomDoorTriggered) {
                        this.bathroomDoorTriggered = true;
                        this.doorSound.play();
                        this.time.delayedCall(200, () => {
                            this.scene.start('BathroomScene2', { from: 'LaundryScene', spawnPoint: 'spawn_from_laundry' });
                        });
                    }
                }, null, this);
            }
            
            // Mushroom interaction
            const mushroom = objectLayer.objects.find(obj => obj.name === 'mushroom');
            if (mushroom) {
                this.mushroomZone = this.add.zone(mushroom.x, mushroom.y, mushroom.width || 32, mushroom.height || 32);
                this.mushroomZone.setOrigin(0, 0);
                this.physics.add.existing(this.mushroomZone, true);
                this.nearMushroom = false;
            }
            
            // Washer interaction
            const washer = objectLayer.objects.find(obj => obj.name === 'washer');
            if (washer) {
                this.washerZone = this.add.zone(washer.x, washer.y, washer.width || 32, washer.height || 32);
                this.washerZone.setOrigin(0, 0);
                this.physics.add.existing(this.washerZone, true);
                this.nearWasher = false;
            }
        }
        
        
        // Initialize Magnus summon state
        this.summonedNPC = null;
        this.summonTimer = null;
        this.lastRecordedPlayerPosition = null;
        this.magnusTargetPosition = null;
        
        // Check if Magnus should be active from previous scene
        checkAndRestoreMagnus(this);
        
        console.log('Laundry created!');
        
        // Autosave when entering scene
        this.time.delayedCall(500, () => {
            window.saveGame(this);
        });
    }

    // Magnus summon system - uses global function
    summonMagnus(skipGreeting = false) {
        window.globalSummonMagnus(this, skipGreeting);
    }
    
    dismissMagnus() {
        window.globalDismissMagnus(this);
    }

    update() {
        // Update Magnus follower AI FIRST
        window.updateMagnusAI(this);
        
        if (!this.player || this.simpleDialogueOpen) return;
        
        this.player.setVelocity(0);
        
        const touchControls = window.touchControls || {};
        const lastA = this.lastAPressed || false;
        this.lastAPressed = touchControls.a || false;
        
        const leftPressed = this.cursors.left.isDown || touchControls.left;
        const rightPressed = this.cursors.right.isDown || touchControls.right;
        const upPressed = this.cursors.up.isDown || touchControls.up;
        const downPressed = this.cursors.down.isDown || touchControls.down;
        const aPressed = Phaser.Input.Keyboard.JustDown(this.actionKey) || (touchControls.a && !lastA);
        
        // Manual overlap checks
        if (this.mushroomZone) {
            this.nearMushroom = this.physics.overlap(this.player, this.mushroomZone);
        }
        if (this.washerZone) {
            this.nearWasher = this.physics.overlap(this.player, this.washerZone);
        }
        
        // Interactions
        if (this.nearMushroom && aPressed) {
            this.buttonSound.play();
            this.showSimpleDialogue("A mysterious mushroom...");
        }
        else if (this.nearWasher && aPressed) {
            this.buttonSound.play();
            if (window.laundryPickedUp) {
                // Put laundry in washer - this permanently deletes it
                window.laundryExists = false;
                window.laundryPickedUp = false;
                window.triggeredEvents.laundryWashed = true; // Permanent flag - laundry never returns
                window.saveGame(this); // Save full game state with mushroom indicator!
                console.log('Laundry washed and game saved');
                this.showSimpleDialogue("You put the dirty laundry in the washer. All clean!");
            } else {
                this.showSimpleDialogue("The washer is empty. Put some laundry in to start it!");
            }
        }
        
        // Movement
        if (leftPressed) {
            this.player.setVelocityX(-currentSpeed);
            this.player.anims.play('walk-left', true);
            setLastDirection('left');
            window.WitchIdleManager.onMovementStart();
        } else if (rightPressed) {
            this.player.setVelocityX(currentSpeed);
            this.player.anims.play('walk-right', true);
            setLastDirection('right');
            window.WitchIdleManager.onMovementStart();
        } else if (upPressed) {
            this.player.setVelocityY(-currentSpeed);
            this.player.anims.play('walk-up', true);
            setLastDirection('up');
            window.WitchIdleManager.onMovementStart();
        } else if (downPressed) {
            this.player.setVelocityY(currentSpeed);
            this.player.anims.play('walk-down', true);
            setLastDirection('down');
            window.WitchIdleManager.onMovementStart();
        } else {
            window.WitchIdleManager.onMovementStop();
            window.playIdleAnimation(this.player, lastDirection);
        
        // Update Magnus checkpoint tracking
        window.updateMagnusCheckpoints(this);
        }
    }

    showSimpleDialogue(text) {
        this.simpleDialogueOpen = true;
        this.player.setVelocity(0);
        
        const dialogue = createDialogueBox(this, text);
        this.simpleDialogueBox = dialogue.box;
        this.simpleDialogueText = dialogue.text;
        
        const touchControls = window.touchControls || {};
        this.lastSimpleA = touchControls.a || false;
        this.lastSimpleB = touchControls.b || false;
        
        const closeDialogue = () => {
            const aPressed = (touchControls.a && !this.lastSimpleA);
            const bPressed = (touchControls.b && !this.lastSimpleB);
            const spacePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
            
            if (aPressed || bPressed || spacePressed) {
                this.buttonSound.play();
                
                if (this.simpleDialogueBox && this.simpleDialogueBox.scene) {
                    this.simpleDialogueBox.destroy();
                }
                if (this.simpleDialogueText && this.simpleDialogueText.scene) {
                    this.simpleDialogueText.destroy();
                }
                
                this.simpleDialogueOpen = false;
                this.events.off('update', closeDialogue);
            }
            
            this.lastSimpleA = touchControls.a || false;
            this.lastSimpleB = touchControls.b || false;
        };
        
        this.events.on('update', closeDialogue);
    }
    
    playNextTrack() {
        // CD playback continues in LaundryScene
        if (!window.currentCD || !window.cdLibrary[window.currentCD]) {
            console.log('No CD to play in LaundryScene');
            return;
        }
        
        const cd = window.cdLibrary[window.currentCD];
        
        if (window.currentTrackIndex >= cd.tracks.length) {
            // End of CD, loop back to start
            window.currentTrackIndex = 0;
        }
        
        const trackPath = cd.tracks[window.currentTrackIndex];
        console.log('LaundryScene: Playing track', window.currentTrackIndex, ':', trackPath);
        
        // Check if track is already loaded
        if (!this.sound.get(trackPath)) {
            this.load.audio(trackPath, trackPath); // trackPath already contains full path like "sounds/cds/to_dacia/track2.mp3"
            this.load.once('complete', () => {
                const music = this.sound.add(trackPath, { volume: 0.5 });
                window.MusicManager.play(music, 'cd');
                
                music.once('complete', () => {
                    console.log('Track complete in LaundryScene, advancing...');
                    window.currentTrackIndex++;
                    const activeScene = this.scene.manager.getScenes(true)[0];
                    if (activeScene && activeScene.playNextTrack) {
                        activeScene.playNextTrack();
                    }
                });
            });
            this.load.start();
        } else {
            const music = this.sound.get(trackPath);
            window.MusicManager.play(music, 'cd');
            
            music.once('complete', () => {
                console.log('Track complete in LaundryScene, advancing...');
                window.currentTrackIndex++;
                const activeScene = this.scene.manager.getScenes(true)[0];
                if (activeScene && activeScene.playNextTrack) {
                    activeScene.playNextTrack();
                }
            });
        }
    }
}

function createAnimations(scene) {
    // Only create if they don't already exist
    if (scene.anims.exists('walk-up')) return;
    
    // Walk animations (8 frames)
    // Sprite sheet is 832x256 (13 columns x 4 rows of 64x64 frames)
    scene.anims.create({
        key: 'walk-up',
        frames: scene.anims.generateFrameNumbers('dacia-walk', { 
            start: 0,  // Row 0, columns 0-7
            end: 7 
        }),
        frameRate: 10,
        repeat: -1
    });
    
    scene.anims.create({
        key: 'walk-left',
        frames: scene.anims.generateFrameNumbers('dacia-walk', { 
            start: 13,  // Row 1, columns 0-7
            end: 20 
        }),
        frameRate: 10,
        repeat: -1
    });
    
    scene.anims.create({
        key: 'walk-down',
        frames: scene.anims.generateFrameNumbers('dacia-walk', { 
            start: 26, // Row 2, columns 0-7
            end: 33 
        }),
        frameRate: 10,
        repeat: -1
    });
    
    scene.anims.create({
        key: 'walk-right',
        frames: scene.anims.generateFrameNumbers('dacia-walk', { 
            start: 39, // Row 3, columns 0-7
            end: 46 
        }),
        frameRate: 10,
        repeat: -1
    });
    
    // Idle animations (2 frames each for breathing effect)
    // Sprite sheet is 832x256 (13 columns x 4 rows of 64x64 frames)
    console.log('Creating idle-up animation...');
    scene.anims.create({
        key: 'idle-up',
        frames: scene.anims.generateFrameNumbers('dacia-idle', { 
            start: 0,  // Row 0, columns 0-1
            end: 1 
        }),
        frameRate: 2,
        repeat: -1
    });
    
    console.log('Creating idle-left animation...');
    scene.anims.create({
        key: 'idle-left',
        frames: scene.anims.generateFrameNumbers('dacia-idle', { 
            start: 13,  // Row 1, columns 0-1
            end: 14 
        }),
        frameRate: 2,
        repeat: -1
    });
    
    console.log('Creating idle-down animation...');
    scene.anims.create({
        key: 'idle-down',
        frames: scene.anims.generateFrameNumbers('dacia-idle', { 
            start: 26,  // Row 2, columns 0-1
            end: 27 
        }),
        frameRate: 2,
        repeat: -1
    });
    
    console.log('Creating idle-right animation...');
    scene.anims.create({
        key: 'idle-right',
        frames: scene.anims.generateFrameNumbers('dacia-idle', { 
            start: 39,  // Row 3, columns 0-1
            end: 40 
        }),
        frameRate: 2,
        repeat: -1
    });
    
    // Sit animation (3 frames) - 832x256 (13 cols x 4 rows)
    scene.anims.create({
        key: 'sit',
        frames: scene.anims.generateFrameNumbers('dacia-sit', { 
            start: 26, // Row 2 (down-facing sit), columns 0-2
            end: 28 
        }),
        frameRate: 3,
        repeat: 0 // Play once
    });
    
    // Sit-up animation (up-facing, 3 frames, slow)
    scene.anims.create({
        key: 'sit-up',
        frames: scene.anims.generateFrameNumbers('dacia-sit', { 
            start: 0, // Row 0 (up-facing sit), columns 0-2
            end: 2 
        }),
        frameRate: 2, // Slow sit-up
        repeat: 0
    });
    
    // Jump animation (5 frames per direction) - 832x256 (13 cols x 4 rows)
    scene.anims.create({
        key: 'jump-up',
        frames: scene.anims.generateFrameNumbers('dacia-jump', { 
            start: 0,  // Row 0, columns 0-4
            end: 4 
        }),
        frameRate: 10,
        repeat: 0
    });
    
    scene.anims.create({
        key: 'jump-down',
        frames: scene.anims.generateFrameNumbers('dacia-jump', { 
            start: 26,  // Row 2, columns 0-4
            end: 30 
        }),
        frameRate: 10,
        repeat: 0
    });
    
    // Emote animation (3 frames) - 832x256 (13 cols x 4 rows)
    scene.anims.create({
        key: 'emote',
        frames: scene.anims.generateFrameNumbers('dacia-emote', { 
            start: 26, // Row 2 (down-facing), columns 0-2
            end: 28 
        }),
        frameRate: 5,
        repeat: 0
    });
    
    // Hurt animation (6 frames) - 832x64 (13 cols x 1 row)
    scene.anims.create({
        key: 'hurt',
        frames: scene.anims.generateFrameNumbers('dacia-hurt', { 
            start: 0,  // Single row, columns 0-5
            end: 5 
        }),
        frameRate: 10,
        repeat: 0
    });
    
    // Spellcast animation (7 frames) - 832x256 (13 cols x 4 rows)
    // Slowed down to 6 fps so the spell lasts longer and is more visible
    scene.anims.create({
        key: 'spellcast-up',
        frames: scene.anims.generateFrameNumbers('dacia-spellcast', { 
            start: 0,  // Row 0, columns 0-6
            end: 6 
        }),
        frameRate: 6,  // Slower for visibility
        repeat: 0
    });
    
    scene.anims.create({
        key: 'spellcast-left',
        frames: scene.anims.generateFrameNumbers('dacia-spellcast', { 
            start: 13,  // Row 1, columns 0-6
            end: 19 
        }),
        frameRate: 6,  // Slower for visibility
        repeat: 0
    });
    
    scene.anims.create({
        key: 'spellcast-down',
        frames: scene.anims.generateFrameNumbers('dacia-spellcast', { 
            start: 26,  // Row 2, columns 0-6
            end: 32 
        }),
        frameRate: 6,  // Slower for visibility
        repeat: 0
    });
    
    scene.anims.create({
        key: 'spellcast-right',
        frames: scene.anims.generateFrameNumbers('dacia-spellcast', { 
            start: 39,  // Row 3, columns 0-6
            end: 45 
        }),
        frameRate: 6,  // Slower for visibility
        repeat: 0
    });
    
    // Legacy spellcast for backwards compatibility
    scene.anims.create({
        key: 'spellcast',
        frames: scene.anims.generateFrameNumbers('dacia-spellcast', { 
            start: 26,  // Default to down
            end: 32 
        }),
        frameRate: 6,  // Slower for visibility
        repeat: 0
    });
    
    // Slash animation (6 frames) - 832x256 (13 cols x 4 rows)
    scene.anims.create({
        key: 'slash',
        frames: scene.anims.generateFrameNumbers('dacia-slash', { 
            start: 0,  // Row 0, columns 0-5
            end: 5 
        }),
        frameRate: 12,
        repeat: 0
    });
    
    // Shoot animation (13 frames)
    scene.anims.create({
        key: 'shoot',
        frames: scene.anims.generateFrameNumbers('dacia-shoot', { 
            start: 0,
            end: 12 
        }),
        frameRate: 15,
        repeat: 0
    });
    
    console.log('Animations created successfully!');
}

// Game configuration - must come AFTER scene classes are defined
const config = {
    type: Phaser.AUTO,
    parent: 'screen-frame',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [BedroomScene, ApartmentScene, ConnorRoomScene, ConnorRoomScene2, BathroomScene, BathroomScene2, LaundryScene],
    scale: {
        mode: Phaser.Scale.NONE,
        width: 480,
        height: 360
    },
    backgroundColor: '#000000',
    pixelArt: true  // Force pixel-perfect rendering
};

// Initialize game function (called after player selection)
let game = null;

async function initGame() {
    if (!game) {
        console.log('Initializing game for player:', window.currentPlayer);
        
        // Load save data from Firebase BEFORE starting the game
        let startScene = BedroomScene;
        
        if (window.currentPlayer) {
            try {
                const saveData = await window.loadGameState(window.currentPlayer);
                
                if (saveData) {
                    console.log('Loaded save data from Firebase:', saveData);
                    
                    // Cache the save data for getSpawnPosition to use
                    window.lastSaveData = saveData;
                    
                    // Restore game state
                    if (saveData.triggeredEvents) window.triggeredEvents = saveData.triggeredEvents;
                    if (saveData.currentOutfit) {
                        console.log('🎨 Restoring outfit from Firebase:', saveData.currentOutfit);
                        window.currentOutfit = saveData.currentOutfit;
                    }
                    if (saveData.cdLibrary) {
                        Object.keys(saveData.cdLibrary).forEach(cdKey => {
                            if (window.cdLibrary[cdKey]) {
                                window.cdLibrary[cdKey].collected = saveData.cdLibrary[cdKey].collected;
                            }
                        });
                    }
                    if (saveData.currentCD !== undefined) window.currentCD = saveData.currentCD;
                    if (saveData.currentTrackIndex !== undefined) window.currentTrackIndex = saveData.currentTrackIndex;
                    if (saveData.laundryExists !== undefined) window.laundryExists = saveData.laundryExists;
                    if (saveData.laundryPickedUp !== undefined) window.laundryPickedUp = saveData.laundryPickedUp;
                    
                    // Determine which scene to start from
                    const sceneMap = {
                        'BedroomScene': BedroomScene,
                        'ApartmentScene': ApartmentScene,
                        'ConnorRoomScene': ConnorRoomScene,
                        'ConnorRoomScene2': ConnorRoomScene2,
                        'BathroomScene': BathroomScene,
                        'BathroomScene2': BathroomScene2,
                        'LaundryScene': LaundryScene
                    };
                    
                    if (saveData.currentScene && sceneMap[saveData.currentScene]) {
                        startScene = sceneMap[saveData.currentScene];
                        console.log('Starting from saved scene:', saveData.currentScene);
                    }
                } else {
                    console.log('No save data found, starting fresh');
                    window.lastSaveData = null;
                }
            } catch (e) {
                console.error('Failed to load save data, starting from bedroom:', e);
                window.lastSaveData = null;
            }
        }
        
        // Update config to start with the correct scene
        const gameConfig = {
            ...config,
            scene: [startScene, BedroomScene, ApartmentScene, ConnorRoomScene, ConnorRoomScene2, BathroomScene, BathroomScene2, LaundryScene].filter((scene, index, arr) => arr.indexOf(scene) === index)
        };
        
        game = new Phaser.Game(gameConfig);
        window.game = game; // Make game globally accessible
        console.log('Game initialized for player:', window.currentPlayer);
    }
}

// Make initGame available globally
window.initGame = initGame;

// Auto-init if player already selected
if (window.currentPlayer) {
    initGame();
}