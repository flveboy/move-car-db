-- 添加性能优化索引

-- 为 owners 表添加索引
CREATE INDEX idx_owners_username ON owners(username);
CREATE INDEX idx_owners_phone ON owners(phone);
CREATE INDEX idx_owners_role_active ON owners(role, isActive);
CREATE INDEX idx_owners_created_at ON owners(createdAt);

-- 为 Vehicle 表添加索引
CREATE INDEX idx_vehicle_owner_id ON Vehicle(ownerId);
CREATE INDEX idx_vehicle_license_plate ON Vehicle(licensePlate);
CREATE INDEX idx_vehicle_created_at ON Vehicle(createdAt);

-- 为 Code 表添加索引
CREATE INDEX idx_code_vehicle_id ON Code(vehicleId);
CREATE INDEX idx_code_owner_id ON Code(ownerId);
CREATE INDEX idx_code_driver_id ON Code(driverId);
CREATE INDEX idx_code_active ON Code(isActive);
CREATE INDEX idx_code_created_at ON Code(createdAt);
CREATE INDEX idx_code_expired_at ON Code(expiredAt);

-- 为 Driver 表添加索引
CREATE INDEX idx_driver_vehicle_id ON Driver(vehicleId);
CREATE INDEX idx_driver_active ON Driver(isActive);
CREATE INDEX idx_driver_created_at ON Driver(createdAt);

-- 为 records 表添加索引
CREATE INDEX idx_records_code_id ON records(codeId);
CREATE INDEX idx_records_owner_id ON records(ownerId);
CREATE INDEX idx_records_scan_time ON records(scanTime);
CREATE INDEX idx_records_created_at ON records(createdAt);

-- 复合索引优化
CREATE INDEX idx_code_owner_active ON Code(ownerId, isActive);
CREATE INDEX idx_vehicle_owner_created ON Vehicle(ownerId, createdAt);
CREATE INDEX idx_records_owner_scan_time ON records(ownerId, scanTime DESC);