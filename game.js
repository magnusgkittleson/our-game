// Global variables
let currentSpeed = 160;
let lastDirection = 'down';

// Apartment Scene
class ApartmentScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ApartmentScene' });
    }

    preload() {
        console.log('Loading apartment assets...');
        
        // Load apartment tilesets
        this.load.image('3d_walls', 'tilesets/3d_walls.png');
        this.load.image('bedroom', 'tilesets/bedroom.png');
        this.load.image('cones', 'tilesets/cones.png');
        this.load.image('generic', 'tilesets/generic.png');
        this.load.image('grocery', 'tilesets/grocery.png');
        this.load.image('home_1', 'tilesets/home_1.png');
        this.load.image('home_2', 'tilesets/home_2.png');
        this.load.image('kitchen', 'tilesets/kitchen.png');
        this.load.image('living_room', 'tilesets/living_room.png');
        this.load.image('room_builder', 'tilesets/room_builder.png');
        this.load.image('tv', 'tilesets/tv.png');
        
        // Load apartment map
        this.load.tilemapTiledJSON('apartment', 'maps/dacia_apartment.json');
        
        // Load character sprite
        this.load.spritesheet('dacia', 'characters/dacia_character.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        
        // Load sounds
        this.load.audio('bgMusic', 'sounds/background_music.mp3');
        this.load.audio('buttonPress', 'sounds/button_press.mp3');
        this.load.audio('doorSound', 'sounds/door_sound.mp3');
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
            map.addTilesetImage('bedroom', 'bedroom'),
            map.addTilesetImage('cones', 'cones'),
            map.addTilesetImage('generic', 'generic'),
            map.addTilesetImage('grocery', 'grocery'),
            map.addTilesetImage('home_1', 'home_1'),
            map.addTilesetImage('home_2', 'home_2'),
            map.addTilesetImage('kitchen', 'kitchen'),
            map.addTilesetImage('living_room', 'living_room'),
            map.addTilesetImage('room_builder', 'room_builder'),
            map.addTilesetImage('tv', 'tv')
        ];
        
        // Create layers
        const floorLayer = map.createLayer('Floor', allTilesets, 0, 0);
        const wallsLayer = map.createLayer('Walls', allTilesets, 0, 0);
        const onWallsLayer = map.createLayer('On Walls', allTilesets, 0, 0);
        const onFloorLayer = map.createLayer('On Floor', allTilesets, 0, 0);
        const nextUpLayer = map.createLayer('Next up', allTilesets, 0, 0);
        const collisionLayer = map.createLayer('Collision', allTilesets, 0, 0);
        
        // Hide and set collision
        if (collisionLayer) {
            collisionLayer.setVisible(false);
            collisionLayer.setCollisionByExclusion([-1]);
        }
        
        // Find spawn point
        const objectLayer = map.getObjectLayer('objects');
        let spawnX = 400;
        let spawnY = 400;
        
        if (objectLayer) {
            const spawnPoint = objectLayer.objects.find(obj => obj.name === 'player_spawn');
            if (spawnPoint) {
                spawnX = spawnPoint.x;
                spawnY = spawnPoint.y;
            }
        }
        
        // Create player
        this.player = this.physics.add.sprite(spawnX, spawnY, 'dacia');
        this.player.setCollideWorldBounds(true);
        this.player.setSize(20, 20);
        this.player.setOffset(22, 44);
        
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
        
        // Set up sounds
        if (!this.sound.get('bgMusic')) {
            this.bgMusic = this.sound.add('bgMusic', { loop: true, volume: 0.3 });
            this.bgMusic.play();
        }
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
                        this.time.delayedCall(200, () => {
                            this.scene.start('BedroomScene');
                        });
                    }
                }, null, this);
            }
        }
        
        console.log('Apartment created!');
    }

    update() {
        if (!this.player) return;
        
        this.player.setVelocity(0);
        
        // Check keyboard OR touch controls
        const touchControls = window.touchControls || {};
        const leftPressed = this.cursors.left.isDown || touchControls.left;
        const rightPressed = this.cursors.right.isDown || touchControls.right;
        const upPressed = this.cursors.up.isDown || touchControls.up;
        const downPressed = this.cursors.down.isDown || touchControls.down;
        
        if (leftPressed) {
            this.player.setVelocityX(-currentSpeed);
            this.player.anims.play('row9', true);
            lastDirection = 'left';
        } else if (rightPressed) {
            this.player.setVelocityX(currentSpeed);
            this.player.anims.play('row11', true);
            lastDirection = 'right';
        } else if (upPressed) {
            this.player.setVelocityY(-currentSpeed);
            this.player.anims.play('row8', true);
            lastDirection = 'up';
        } else if (downPressed) {
            this.player.setVelocityY(currentSpeed);
            this.player.anims.play('row10', true);
            lastDirection = 'down';
        } else {
            this.player.anims.play('idle-' + lastDirection, true);
        }
    }
}

// Bedroom Scene
class BedroomScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BedroomScene' });
    }

    preload() {
        console.log('Loading bedroom assets...');
        
        // Load bedroom tilesets
        this.load.image('art', 'tilesets/art.png');
        this.load.image('basement', 'tilesets/basement.png');
        this.load.image('christmas', 'tilesets/christmas.png');
        this.load.image('classroom', 'tilesets/classroom.png');
        this.load.image('clothing', 'tilesets/clothing.png');
        this.load.image('floors', 'tilesets/floors.png');
        this.load.image('hospital', 'tilesets/hospital.png');
        this.load.image('museum', 'tilesets/museum.png');
        this.load.image('music', 'tilesets/music.png');
        
        // Shared tilesets already loaded in apartment
        
        // Load bedroom map
        this.load.tilemapTiledJSON('bedroom', 'maps/dacia_bedroom.json');
        
        // Load note text
        this.load.text('note1', 'notes/bedroom_letter_1.txt');
    }

    create() {
        console.log('Creating bedroom...');
        
        const map = this.make.tilemap({ key: 'bedroom' });
        
        // Set physics world bounds to match the MAP size, not canvas
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        
        // Add all tilesets
        const allTilesets = [
            map.addTilesetImage('3d_walls', '3d_walls'),
            map.addTilesetImage('art', 'art'),
            map.addTilesetImage('basement', 'basement'),
            map.addTilesetImage('bedroom', 'bedroom'),
            map.addTilesetImage('christmas', 'christmas'),
            map.addTilesetImage('classroom', 'classroom'),
            map.addTilesetImage('clothing', 'clothing'),
            map.addTilesetImage('floors', 'floors'),
            map.addTilesetImage('generic', 'generic'),
            map.addTilesetImage('grocery', 'grocery'),
            map.addTilesetImage('hospital', 'hospital'),
            map.addTilesetImage('living_room', 'living_room'),
            map.addTilesetImage('museum', 'museum'),
            map.addTilesetImage('music', 'music'),
            map.addTilesetImage('room_builder', 'room_builder')
        ];
        
        // Create layers explicitly
        const floorLayer = map.createLayer('Floor', allTilesets, 0, 0);
        const wallsLayer = map.createLayer('Walls', allTilesets, 0, 0);
        const onFloorLayer = map.createLayer('On Floor', allTilesets, 0, 0);
        const tileLayer6 = map.createLayer('Tile Layer 6', allTilesets, 0, 0);
        const onWallsLayer = map.createLayer('On Walls', allTilesets, 0, 0);
        const upLayer = map.createLayer('up', allTilesets, 0, 0);
        const collisionLayer = map.createLayer('Collision', allTilesets, 0, 0);
        
        console.log('Bedroom layers created');
        
        // Hide and set collision
        if (collisionLayer) {
            collisionLayer.setVisible(false);
            collisionLayer.setCollisionByExclusion([-1]);
            this.collisionLayer = collisionLayer;
        }
        
        // Find spawn point
        const objectLayer = map.getObjectLayer('objects');
        let spawnX = 200;
        let spawnY = 200;
        
        if (objectLayer) {
            const spawnPoint = objectLayer.objects.find(obj => obj.name === 'player_spawn');
            if (spawnPoint) {
                spawnX = spawnPoint.x;
                spawnY = spawnPoint.y;
            }
        }
        
        // Create player
        this.player = this.physics.add.sprite(spawnX, spawnY, 'dacia');
        this.player.setCollideWorldBounds(true);
        this.player.setSize(20, 20);
        this.player.setOffset(22, 44);
        
        // Set up collision
        if (this.collisionLayer) {
            this.physics.add.collider(this.player, this.collisionLayer);
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
        
        // Set up sounds
        this.buttonSound = this.sound.add('buttonPress', { volume: 0.5 });
        this.doorSound = this.sound.add('doorSound', { volume: 0.6 });
        
        // Animations already created in apartment scene
        
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
                            this.scene.start('ApartmentScene');
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
        }
        
        console.log('Bedroom created!');
    }

    update() {
        if (!this.player || this.noteOpen) return;
        
        this.player.setVelocity(0);
        
        // Check keyboard OR touch controls
        const touchControls = window.touchControls || {};
        const leftPressed = this.cursors.left.isDown || touchControls.left;
        const rightPressed = this.cursors.right.isDown || touchControls.right;
        const upPressed = this.cursors.up.isDown || touchControls.up;
        const downPressed = this.cursors.down.isDown || touchControls.down;
        const aPressed = Phaser.Input.Keyboard.JustDown(this.actionKey) || (touchControls.a && !this.lastAPressed);
        
        // Track A button state to prevent repeated triggers
        this.lastAPressed = touchControls.a;
        
        // Check if near note and A is pressed
        if (this.nearNote && aPressed) {
            this.buttonSound.play();
            this.showNote();
        }
        
        // Reset nearNote flag
        this.nearNote = false;
        
        if (leftPressed) {
            this.player.setVelocityX(-currentSpeed);
            this.player.anims.play('row9', true);
            lastDirection = 'left';
        } else if (rightPressed) {
            this.player.setVelocityX(currentSpeed);
            this.player.anims.play('row11', true);
            lastDirection = 'right';
        } else if (upPressed) {
            this.player.setVelocityY(-currentSpeed);
            this.player.anims.play('row8', true);
            lastDirection = 'up';
        } else if (downPressed) {
            this.player.setVelocityY(currentSpeed);
            this.player.anims.play('row10', true);
            lastDirection = 'down';
        } else {
            this.player.anims.play('idle-' + lastDirection, true);
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
                fontSize: '16px',
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
                fontSize: '14px',
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
}

function createAnimations(scene) {
    // Only create if they don't already exist
    if (scene.anims.exists('row8')) return;
    
    const FRAMES_PER_ROW = 13;
    
    // Walking animations
    scene.anims.create({
        key: 'row8',
        frames: scene.anims.generateFrameNumbers('dacia', { 
            start: 8 * FRAMES_PER_ROW, 
            end: 8 * FRAMES_PER_ROW + 8 
        }),
        frameRate: 10,
        repeat: -1
    });
    
    scene.anims.create({
        key: 'row9',
        frames: scene.anims.generateFrameNumbers('dacia', { 
            start: 9 * FRAMES_PER_ROW, 
            end: 9 * FRAMES_PER_ROW + 8 
        }),
        frameRate: 10,
        repeat: -1
    });
    
    scene.anims.create({
        key: 'row10',
        frames: scene.anims.generateFrameNumbers('dacia', { 
            start: 10 * FRAMES_PER_ROW, 
            end: 10 * FRAMES_PER_ROW + 8 
        }),
        frameRate: 10,
        repeat: -1
    });
    
    scene.anims.create({
        key: 'row11',
        frames: scene.anims.generateFrameNumbers('dacia', { 
            start: 11 * FRAMES_PER_ROW, 
            end: 11 * FRAMES_PER_ROW + 8 
        }),
        frameRate: 10,
        repeat: -1
    });
    
    // Idle animations
    scene.anims.create({
        key: 'idle-up',
        frames: [{ key: 'dacia', frame: 8 * FRAMES_PER_ROW }],
        frameRate: 1
    });
    
    scene.anims.create({
        key: 'idle-left',
        frames: [{ key: 'dacia', frame: 9 * FRAMES_PER_ROW }],
        frameRate: 1
    });
    
    scene.anims.create({
        key: 'idle-down',
        frames: [{ key: 'dacia', frame: 10 * FRAMES_PER_ROW }],
        frameRate: 1
    });
    
    scene.anims.create({
        key: 'idle-right',
        frames: [{ key: 'dacia', frame: 11 * FRAMES_PER_ROW }],
        frameRate: 1
    });
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
    scene: [ApartmentScene, BedroomScene],
    scale: {
        mode: Phaser.Scale.NONE,  // No automatic scaling
        width: 640,
        height: 480
    },
    backgroundColor: '#000000'
};

const game = new Phaser.Game(config);

// Manually resize canvas to fill screen-frame
function resizeGame() {
    const screenFrame = document.getElementById('screen-frame');
    if (screenFrame) {
        const width = screenFrame.clientWidth;
        const height = screenFrame.clientHeight;
        game.scale.resize(width, height);
    }
}

window.addEventListener('resize', resizeGame);
window.addEventListener('load', resizeGame);
// Call immediately
setTimeout(resizeGame, 100);