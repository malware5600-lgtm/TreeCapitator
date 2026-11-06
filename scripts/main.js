import { world, BlockPermutation } from "@minecraft/server";

// Blocos de madeira suportados
const LOG_TYPES = new Set([
  "minecraft:oak_log",
  "minecraft:spruce_log",
  "minecraft:birch_log",
  "minecraft:jungle_log",
  "minecraft:acacia_log",
  "minecraft:dark_oak_log",
  "minecraft:mangrove_log",
  "minecraft:cherry_log",
  "minecraft:crimson_stem",
  "minecraft:warped_stem"
]);

// Machados que ativam o efeito
const AXES = new Set([
  "minecraft:wooden_axe",
  "minecraft:stone_axe",
  "minecraft:iron_axe",
  "minecraft:golden_axe",
  "minecraft:diamond_axe",
  "minecraft:netherite_axe"
]);

world.beforeEvents.playerBreakBlock.subscribe((event) => {
  const { player, block, itemStack } = event;

  // Verifica se o item usado é um machado
  if (!itemStack || !AXES.has(itemStack.typeId)) return;

  // Verifica se o bloco quebrado é um tronco
  if (!LOG_TYPES.has(block.typeId)) return;

  const dimension = player.dimension;
  const startLoc = block.location;
  
  // Fila para encontrar troncos conectados (limite máximo de 128 blocos para não travar)
  const queue = [startLoc];
  const visited = new Set([`${startLoc.x},${startLoc.y},${startLoc.z}`]);
  const logsToBreak = [];

  while (queue.length > 0 && logsToBreak.length < 128) {
    const current = queue.shift();
    logsToBreak.push(current);

    // Checa vizinhos (ao redor e acima/abaixo)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = 0; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dy === 0 && dz === 0) continue;

          const nx = current.x + dx;
          const ny = current.y + dy;
          const nz = current.z + dz;
          const key = `${nx},${ny},${nz}`;

          if (visited.has(key)) continue;
          visited.add(key);

          const neighborBlock = dimension.getBlock({ x: nx, y: ny, z: nz });
          if (neighborBlock && LOG_TYPES.has(neighborBlock.typeId)) {
            queue.push({ x: nx, y: ny, z: nz });
          }
        }
      }
    }
  }

  // Destrói os troncos conectados no próximo tick do jogo
  system.run(() => {
    for (const loc of logsToBreak) {
      const b = dimension.getBlock(loc);
      if (b && LOG_TYPES.has(b.typeId)) {
        dimension.runCommand(`setblock ${loc.x} ${loc.y} ${loc.z} air destroy`);
      }
    }
  });
});
