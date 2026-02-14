// NineSliceBox - Helper class to create scalable UI boxes from 9-slice tileset
// Usage: const box = new NineSliceBox(scene, x, y, width, height, 'ui_tileset', frameConfig);

class NineSliceBox {
    constructor(scene, x, y, width, height, texture, config) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.texture = texture;
        
        // Default config for the brown frame from your tileset (top-left area)
        this.config = config || {
            topLeft: 0,      // Frame index for top-left corner
            top: 1,          // Frame index for top edge
            topRight: 2,     // Frame index for top-right corner
            left: 32,        // Frame index for left edge (next row)
            middle: 33,      // Frame index for middle fill
            right: 34,       // Frame index for right edge
            bottomLeft: 64,  // Frame index for bottom-left corner
            bottom: 65,      // Frame index for bottom edge
            bottomRight: 66  // Frame index for bottom-right corner
        };
        
        this.container = scene.add.container(x, y);
        this.parts = [];
        
        this.build();
    }
    
    build() {
        const tileSize = 32; // Each UI tile is 32x32
        
        // Calculate how many tiles we need
        const tilesWide = Math.ceil(this.width / tileSize);
        const tilesHigh = Math.ceil(this.height / tileSize);
        
        // Clear existing parts
        this.parts.forEach(part => part.destroy());
        this.parts = [];
        
        // Build the box tile by tile
        for (let row = 0; row < tilesHigh; row++) {
            for (let col = 0; col < tilesWide; col++) {
                let frameIndex;
                
                // Determine which frame to use based on position
                if (row === 0 && col === 0) {
                    frameIndex = this.config.topLeft;
                } else if (row === 0 && col === tilesWide - 1) {
                    frameIndex = this.config.topRight;
                } else if (row === tilesHigh - 1 && col === 0) {
                    frameIndex = this.config.bottomLeft;
                } else if (row === tilesHigh - 1 && col === tilesWide - 1) {
                    frameIndex = this.config.bottomRight;
                } else if (row === 0) {
                    frameIndex = this.config.top;
                } else if (row === tilesHigh - 1) {
                    frameIndex = this.config.bottom;
                } else if (col === 0) {
                    frameIndex = this.config.left;
                } else if (col === tilesWide - 1) {
                    frameIndex = this.config.right;
                } else {
                    frameIndex = this.config.middle;
                }
                
                const tile = this.scene.add.image(
                    col * tileSize - this.width / 2,
                    row * tileSize - this.height / 2,
                    this.texture,
                    frameIndex
                );
                tile.setOrigin(0, 0);
                
                this.container.add(tile);
                this.parts.push(tile);
            }
        }
    }
    
    setScrollFactor(x, y) {
        this.container.setScrollFactor(x, y || x);
        return this;
    }
    
    setDepth(depth) {
        this.container.setDepth(depth);
        return this;
    }
    
    destroy() {
        this.container.destroy();
    }
}

// Make it available globally
window.NineSliceBox = NineSliceBox;
